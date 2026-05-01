"use client";

import { useMemo, useState } from "react";

const GENRES = [
  "Fantasy",
  "Science Fiction",
  "Romance",
  "Mystery",
  "Horror",
  "Literary",
  "Poetry",
  "Memoir",
  "Thriller",
  "Historical",
  "Comedy",
  "Nonfiction",
];

type UserProfile = {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  email: string | null;
  timezone: string;
  profileVisibility: "PRIVATE" | "MEMBERS" | "PUBLIC";
  showEmailOnProfile: boolean;
  allowNsfwStories: boolean;
  favoriteGenres: string[];
  mutedGenres: string[];
  feedIncludesPublic: boolean;
  feedIncludesFriends: boolean;
  feedIncludesPrompts: boolean;
  updatedAt: string;
};

type WordGoal = {
  id: string;
  title: string;
  description: string | null;
  dailyTargetWords: number;
  isActive: boolean;
  currentStreakDays: number;
  bestStreakDays: number;
  createdAt: string;
  updatedAt: string;
};

type UserSettingsProps = {
  initialUser: UserProfile;
  initialGoals: WordGoal[];
};

type GoalDraft = {
  title: string;
  description: string;
  dailyTargetWords: number;
  isActive: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        checked={checked}
        className="h-5 w-5 accent-slate-950"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
    </label>
  );
}

function GenrePicker({
  label,
  selectedGenres,
  onChange,
}: {
  label: string;
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedGenres), [selectedGenres]);

  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-700">{label}</div>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((genre) => {
          const isSelected = selectedSet.has(genre);

          return (
            <button
              className={`rounded-full border px-3 py-2 text-sm font-medium ${
                isSelected
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
              key={genre}
              onClick={() => {
                onChange(
                  isSelected
                    ? selectedGenres.filter((selected) => selected !== genre)
                    : [...selectedGenres, genre]
                );
              }}
              type="button"
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function UserSettings({ initialUser, initialGoals }: UserSettingsProps) {
  const [profile, setProfile] = useState(initialUser);
  const [goals, setGoals] = useState(initialGoals);
  const [profileMessage, setProfileMessage] = useState("");
  const [goalMessage, setGoalMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState<GoalDraft>({
    title: "",
    description: "",
    dailyTargetWords: 500,
    isActive: true,
  });

  const updateProfile = <Key extends keyof UserProfile>(
    key: Key,
    value: UserProfile[Key]
  ) => {
    setProfile((current) => ({ ...current, [key]: value }));
    setProfileMessage("");
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage("Saving settings...");

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profile),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: UserProfile;
      };

      if (!response.ok || !data.user) {
        setProfileMessage(data.error ?? "Unable to save settings.");
        return;
      }

      setProfile({
        ...data.user,
        updatedAt: new Date(data.user.updatedAt).toISOString(),
      });
      setProfileMessage("Settings saved.");
    } catch {
      setProfileMessage("Unable to save settings.");
    } finally {
      setSavingProfile(false);
    }
  };

  const createGoal = async () => {
    setSavingGoalId("new");
    setGoalMessage("Creating goal...");

    try {
      const response = await fetch("/api/user/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newGoal),
      });

      const data = (await response.json()) as {
        error?: string;
        goal?: WordGoal;
      };

      if (!response.ok || !data.goal) {
        setGoalMessage(data.error ?? "Unable to create goal.");
        return;
      }

      setGoals((current) => [data.goal as WordGoal, ...current]);
      setNewGoal({
        title: "",
        description: "",
        dailyTargetWords: 500,
        isActive: true,
      });
      setGoalMessage("Goal created.");
    } catch {
      setGoalMessage("Unable to create goal.");
    } finally {
      setSavingGoalId(null);
    }
  };

  const updateGoal = async (goal: WordGoal) => {
    setSavingGoalId(goal.id);
    setGoalMessage("Saving goal...");

    try {
      const response = await fetch(`/api/user/goals/${goal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(goal),
      });

      const data = (await response.json()) as {
        error?: string;
        goal?: WordGoal;
      };

      if (!response.ok || !data.goal) {
        setGoalMessage(data.error ?? "Unable to save goal.");
        return;
      }

      setGoals((current) =>
        current.map((currentGoal) =>
          currentGoal.id === data.goal?.id ? (data.goal as WordGoal) : currentGoal
        )
      );
      setGoalMessage("Goal saved.");
    } catch {
      setGoalMessage("Unable to save goal.");
    } finally {
      setSavingGoalId(null);
    }
  };

  const patchGoalState = <Key extends keyof WordGoal>(
    goalId: string,
    key: Key,
    value: WordGoal[Key]
  ) => {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId ? { ...goal, [key]: value } : goal
      )
    );
    setGoalMessage("");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-semibold text-slate-950">Profile</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Display name
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) => updateProfile("name", event.target.value)}
                value={profile.name ?? ""}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Username
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) =>
                  updateProfile("username", event.target.value)
                }
                value={profile.username ?? ""}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                readOnly
                value={profile.email ?? ""}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Timezone
              </span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) =>
                  updateProfile("timezone", event.target.value)
                }
                value={profile.timezone}
              />
            </label>
          </div>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Bio
            </span>
            <textarea
              className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              onChange={(event) => updateProfile("bio", event.target.value)}
              value={profile.bio ?? ""}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-semibold text-slate-950">Preferences</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Profile visibility
              </span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) =>
                  updateProfile(
                    "profileVisibility",
                    event.target.value as UserProfile["profileVisibility"]
                  )
                }
                value={profile.profileVisibility}
              >
                <option value="PUBLIC">Public</option>
                <option value="MEMBERS">Members only</option>
                <option value="PRIVATE">Private</option>
              </select>
            </label>
            <div className="grid gap-3">
              <Toggle
                checked={profile.showEmailOnProfile}
                label="Show email on profile"
                onChange={(checked) =>
                  updateProfile("showEmailOnProfile", checked)
                }
              />
              <Toggle
                checked={profile.allowNsfwStories}
                label="Show NSFW stories"
                onChange={(checked) => updateProfile("allowNsfwStories", checked)}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            <GenrePicker
              label="Favorite genres"
              onChange={(genres) => updateProfile("favoriteGenres", genres)}
              selectedGenres={profile.favoriteGenres}
            />
            <GenrePicker
              label="Muted genres"
              onChange={(genres) => updateProfile("mutedGenres", genres)}
              selectedGenres={profile.mutedGenres}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-xl font-semibold text-slate-950">Feed</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Toggle
              checked={profile.feedIncludesPublic}
              label="Public stories"
              onChange={(checked) => updateProfile("feedIncludesPublic", checked)}
            />
            <Toggle
              checked={profile.feedIncludesFriends}
              label="Friend stories"
              onChange={(checked) =>
                updateProfile("feedIncludesFriends", checked)
              }
            />
            <Toggle
              checked={profile.feedIncludesPrompts}
              label="Prompt responses"
              onChange={(checked) =>
                updateProfile("feedIncludesPrompts", checked)
              }
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={savingProfile}
              onClick={saveProfile}
              type="button"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
            {profileMessage ? (
              <span className="text-sm text-slate-500">{profileMessage}</span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-slate-950">Goals</h2>
          <div className="mt-4 grid gap-3">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              onChange={(event) =>
                setNewGoal((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Goal name"
              value={newGoal.title}
            />
            <textarea
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              onChange={(event) =>
                setNewGoal((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Short description"
              value={newGoal.description}
            />
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                min={1}
                onChange={(event) =>
                  setNewGoal((current) => ({
                    ...current,
                    dailyTargetWords: Number(event.target.value),
                  }))
                }
                type="number"
                value={newGoal.dailyTargetWords}
              />
              <button
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={savingGoalId === "new"}
                onClick={createGoal}
                type="button"
              >
                {savingGoalId === "new" ? "Adding..." : "Add Goal"}
              </button>
            </div>
          </div>
          {goalMessage ? (
            <p className="mt-3 text-sm text-slate-500">{goalMessage}</p>
          ) : null}
        </div>

        {goals.map((goal) => (
          <div
            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            key={goal.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-500">
                Created {formatDate(goal.createdAt)}
              </span>
              <Toggle
                checked={goal.isActive}
                label="Active"
                onChange={(checked) => patchGoalState(goal.id, "isActive", checked)}
              />
            </div>
            <div className="mt-4 grid gap-3">
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-medium outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) =>
                  patchGoalState(goal.id, "title", event.target.value)
                }
                value={goal.title}
              />
              <textarea
                className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                onChange={(event) =>
                  patchGoalState(goal.id, "description", event.target.value)
                }
                value={goal.description ?? ""}
              />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">
                  Daily target words
                </span>
                <input
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                  min={1}
                  onChange={(event) =>
                    patchGoalState(
                      goal.id,
                      "dailyTargetWords",
                      Number(event.target.value)
                    )
                  }
                  type="number"
                  value={goal.dailyTargetWords}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-4 text-sm text-slate-500">
                <span>{goal.currentStreakDays} day streak</span>
                <span>Best {goal.bestStreakDays}</span>
              </div>
              <button
                className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingGoalId === goal.id}
                onClick={() => updateGoal(goal)}
                type="button"
              >
                {savingGoalId === goal.id ? "Saving..." : "Save Goal"}
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
