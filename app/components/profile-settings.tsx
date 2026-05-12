"use client";

import Link from "next/link";
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
  dailyTargetWords: number;
  streakGoalDays: number;
  showProfileSection: boolean;
  showPreferencesSection: boolean;
  showFeedSection: boolean;
  showGoalsSection: boolean;
  showFriendsSection: boolean;
  updatedAt: string;
};

type CustomGoal = {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Friend = {
  id: string;
  friendshipId: string;
  displayName: string;
  username: string | null;
  bio: string | null;
  friendsSince: string;
};

type ProfileSettingsProps = {
  initialUser: UserProfile;
  initialGoals: CustomGoal[];
  initialFriends: Friend[];
};

type GoalDraft = {
  title: string;
  description: string;
};

type SectionVisibilityKey =
  | "showProfileSection"
  | "showPreferencesSection"
  | "showFeedSection"
  | "showGoalsSection"
  | "showFriendsSection";

const PROFILE_SECTIONS: Array<{
  key: SectionVisibilityKey;
  label: string;
}> = [
  { key: "showProfileSection", label: "Profile" },
  { key: "showPreferencesSection", label: "Preferences" },
  { key: "showFeedSection", label: "Feed" },
  { key: "showGoalsSection", label: "Goals" },
  { key: "showFriendsSection", label: "Friends" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function usernameLabel(username: string | null) {
  return username ? `@${username}` : "No username";
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
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-white/75 px-4 py-3">
      <span className="text-sm font-bold text-[var(--charcoal)]">{label}</span>
      <input
        checked={checked}
        className="h-5 w-5 accent-[var(--sage)]"
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
      <div className="mb-2 text-sm font-bold text-[var(--charcoal)]">{label}</div>
      <div className="flex flex-wrap gap-2">
        {GENRES.map((genre) => {
          const isSelected = selectedSet.has(genre);

          return (
            <button
              className={`rounded-full border px-3 py-2 text-sm font-medium ${
                isSelected
                  ? "border-[var(--sage)] bg-[var(--sage)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--sage-dark)] hover:border-[var(--line-strong)]"
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

export function ProfileSettings({
  initialUser,
  initialGoals,
  initialFriends,
}: ProfileSettingsProps) {
  const [profile, setProfile] = useState(initialUser);
  const [goals, setGoals] = useState(initialGoals);
  const [profileMessage, setProfileMessage] = useState("");
  const [goalMessage, setGoalMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingGoalId, setSavingGoalId] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState<GoalDraft>({
    title: "",
    description: "",
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
      const response = await fetch("/api/profile/settings", {
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
      const response = await fetch("/api/profile/goals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newGoal),
      });

      const data = (await response.json()) as {
        error?: string;
        goal?: CustomGoal;
      };

      if (!response.ok || !data.goal) {
        setGoalMessage(data.error ?? "Unable to create goal.");
        return;
      }

      setGoals((current) => [data.goal as CustomGoal, ...current]);
      setNewGoal({
        title: "",
        description: "",
      });
      setGoalMessage("Goal created.");
    } catch {
      setGoalMessage("Unable to create goal.");
    } finally {
      setSavingGoalId(null);
    }
  };

  const updateGoal = async (goal: CustomGoal) => {
    setSavingGoalId(goal.id);
    setGoalMessage("Saving goal...");

    try {
      const response = await fetch(`/api/profile/goals/${goal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(goal),
      });

      const data = (await response.json()) as {
        error?: string;
        goal?: CustomGoal;
      };

      if (!response.ok || !data.goal) {
        setGoalMessage(data.error ?? "Unable to save goal.");
        return;
      }

      setGoals((current) =>
        current.map((currentGoal) =>
          currentGoal.id === data.goal?.id
            ? (data.goal as CustomGoal)
            : currentGoal
        )
      );
      setGoalMessage("Goal saved.");
    } catch {
      setGoalMessage("Unable to save goal.");
    } finally {
      setSavingGoalId(null);
    }
  };

  const completeGoal = async (goal: CustomGoal) => {
    setSavingGoalId(goal.id);
    setGoalMessage("Completing goal...");

    try {
      const response = await fetch(`/api/profile/goals/${goal.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isCompleted: true }),
      });

      const data = (await response.json()) as {
        error?: string;
        goal?: CustomGoal;
      };

      if (!response.ok || !data.goal) {
        setGoalMessage(data.error ?? "Unable to complete goal.");
        return;
      }

      setGoals((current) =>
        current.filter((currentGoal) => currentGoal.id !== goal.id)
      );
      setGoalMessage("Goal completed.");
    } catch {
      setGoalMessage("Unable to complete goal.");
    } finally {
      setSavingGoalId(null);
    }
  };

  const deleteGoal = async (goalId: string) => {
    setSavingGoalId(goalId);
    setGoalMessage("Deleting goal...");

    try {
      const response = await fetch(`/api/profile/goals/${goalId}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as {
        error?: string;
        goal?: { id: string };
      };

      if (!response.ok || !data.goal) {
        setGoalMessage(data.error ?? "Unable to delete goal.");
        return;
      }

      setGoals((current) => current.filter((goal) => goal.id !== goalId));
      setGoalMessage("Goal deleted.");
    } catch {
      setGoalMessage("Unable to delete goal.");
    } finally {
      setSavingGoalId(null);
    }
  };

  const patchGoalState = <Key extends keyof CustomGoal>(
    goalId: string,
    key: Key,
    value: CustomGoal[Key]
  ) => {
    setGoals((current) =>
      current.map((goal) =>
        goal.id === goalId ? { ...goal, [key]: value } : goal
      )
    );
    setGoalMessage("");
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
        <h2 className="font-literary text-2xl font-semibold text-[var(--charcoal)]">
          Visible Sections
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PROFILE_SECTIONS.map((section) => (
            <Toggle
              checked={profile[section.key]}
              key={section.key}
              label={section.label}
              onChange={(checked) => updateProfile(section.key, checked)}
            />
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="space-y-6">
          {profile.showProfileSection ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
              <h2 className="font-literary text-2xl font-semibold text-[var(--charcoal)]">Profile</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
                    Display name
                  </span>
                  <input
                    className="app-field w-full px-4 py-3"
                    onChange={(event) =>
                      updateProfile("name", event.target.value)
                    }
                    value={profile.name ?? ""}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
                    Username
                  </span>
                  <input
                    className="app-field w-full px-4 py-3"
                    onChange={(event) =>
                      updateProfile("username", event.target.value)
                    }
                    value={profile.username ?? ""}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
                    Email
                  </span>
                  <input
                    className="app-field w-full px-4 py-3 text-[var(--muted)]"
                    readOnly
                    value={profile.email ?? ""}
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
                    Timezone
                  </span>
                  <input
                    className="app-field w-full px-4 py-3"
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
                  className="app-field min-h-32 w-full px-4 py-3"
                  onChange={(event) => updateProfile("bio", event.target.value)}
                  value={profile.bio ?? ""}
                />
              </label>
            </div>
          ) : null}

          {profile.showPreferencesSection ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
              <h2 className="font-literary text-2xl font-semibold text-[var(--charcoal)]">
                Preferences
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[var(--charcoal)]">
                    Profile visibility
                  </span>
                  <select
                    className="app-field w-full px-4 py-3"
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
                    onChange={(checked) =>
                      updateProfile("allowNsfwStories", checked)
                    }
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
          ) : null}

          {profile.showFeedSection ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[var(--shadow-soft)]">
              <h2 className="font-literary text-2xl font-semibold text-[var(--charcoal)]">Feed</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Toggle
                  checked={profile.feedIncludesPublic}
                  label="Public stories"
                  onChange={(checked) =>
                    updateProfile("feedIncludesPublic", checked)
                  }
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
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="app-button-primary px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
              disabled={savingProfile}
              onClick={saveProfile}
              type="button"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
            {profileMessage ? (
              <span className="text-sm font-semibold text-[var(--muted)]">{profileMessage}</span>
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          {profile.showGoalsSection ? (
            <div className="rounded-2xl border border-[var(--line)] bg-white/75 p-5 shadow-[var(--shadow-soft)]">
              <h2 className="font-literary text-2xl font-semibold text-[var(--charcoal)]">Goals</h2>

              <div className="mt-4 border-t border-slate-200 pt-4">
                <h3 className="font-bold text-[var(--charcoal)]">Daily Words</h3>
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Daily target words
                  </span>
                  <input
                    className="app-field w-full px-4 py-3"
                    min={1}
                    onChange={(event) =>
                      updateProfile(
                        "dailyTargetWords",
                        Number(event.target.value)
                      )
                    }
                    type="number"
                    value={profile.dailyTargetWords}
                  />
                </label>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <h3 className="font-bold text-[var(--charcoal)]">Streak Goals</h3>
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Streak goal days
                  </span>
                  <input
                    className="app-field w-full px-4 py-3"
                    min={1}
                    onChange={(event) =>
                      updateProfile("streakGoalDays", Number(event.target.value))
                    }
                    type="number"
                    value={profile.streakGoalDays}
                  />
                </label>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <h3 className="font-bold text-[var(--charcoal)]">Custom Goal</h3>
                <div className="mt-3 grid gap-3">
                  <input
                    className="app-field w-full px-4 py-3"
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
                    className="app-field min-h-24 w-full px-4 py-3"
                    onChange={(event) =>
                      setNewGoal((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Short description"
                    value={newGoal.description}
                  />
                  <button
                    className="app-button-primary w-full px-5 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-[var(--muted)] sm:w-auto"
                    disabled={savingGoalId === "new"}
                    onClick={createGoal}
                    type="button"
                  >
                    {savingGoalId === "new" ? "Adding..." : "Add Goal"}
                  </button>
                </div>
                {goalMessage ? (
                  <p className="mt-3 text-sm font-semibold text-[var(--muted)]">{goalMessage}</p>
                ) : null}
              </div>

              <div className="mt-5 border-t border-slate-200 pt-4">
                <h3 className="font-semibold text-slate-950">Created Goals</h3>
                <div className="mt-3 space-y-4">
                  {goals.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      No custom goals yet.
                    </div>
                  ) : null}

                  {goals.map((goal) => (
                    <div
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      key={goal.id}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span className="text-sm text-slate-500">
                          Created {formatDate(goal.createdAt)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                          Custom
                        </span>
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
                            patchGoalState(
                              goal.id,
                              "description",
                              event.target.value
                            )
                          }
                          value={goal.description ?? ""}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={savingGoalId === goal.id}
                          onClick={() => updateGoal(goal)}
                          type="button"
                        >
                          {savingGoalId === goal.id ? "Saving..." : "Save Goal"}
                        </button>
                        <button
                          className="rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={savingGoalId === goal.id}
                          onClick={() => completeGoal(goal)}
                          type="button"
                        >
                          Complete
                        </button>
                        <button
                          className="rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={savingGoalId === goal.id}
                          onClick={() => deleteGoal(goal.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {profile.showFriendsSection ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-950">
                  Friends
                </h2>
                <Link
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  href="/search"
                >
                  Find Writers
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {initialFriends.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    No friends yet.
                  </div>
                ) : null}

                {initialFriends.map((friend) => (
                  <article
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    key={friend.friendshipId}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words font-semibold text-slate-950">
                          {friend.displayName}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {usernameLabel(friend.username)}
                        </p>
                      </div>
                      <Link
                        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        href={`/users/${friend.id}`}
                      >
                        View Profile
                      </Link>
                    </div>
                    {friend.bio ? (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
                        {friend.bio}
                      </p>
                    ) : null}
                    <p className="mt-3 text-xs text-slate-500">
                      Friends since {formatDate(friend.friendsSince)}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
