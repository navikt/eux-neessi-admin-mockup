"use client";

import { ActionMenu } from "@navikt/ds-react";
import { LeaveIcon, PersonCircleIcon } from "@navikt/aksel-icons";
import { logout } from "@/app/login/actions";
import { initials, type SessionUser } from "@/lib/session";

export function UserMenu({ user }: { user: SessionUser }) {
  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <button type="button" className="user-chip" aria-label={`Innlogget som ${user.name}`}>
          <span className="avatar">{initials(user.name)}</span>
          <span className="hide-sm">
            <div className="user-chip__name">{user.name}</div>
            <div className="user-chip__title">{user.title}</div>
          </span>
        </button>
      </ActionMenu.Trigger>
      <ActionMenu.Content align="end">
        <ActionMenu.Label>{user.name}</ActionMenu.Label>
        <ActionMenu.Item icon={<PersonCircleIcon aria-hidden />} disabled>
          {user.title}
        </ActionMenu.Item>
        <ActionMenu.Divider />
        <ActionMenu.Item
          icon={<LeaveIcon aria-hidden />}
          variant="danger"
          onSelect={() => {
            void logout();
          }}
        >
          Logg ut
        </ActionMenu.Item>
      </ActionMenu.Content>
    </ActionMenu>
  );
}
