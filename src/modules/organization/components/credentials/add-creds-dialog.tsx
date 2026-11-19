import type { ComponentProps } from "react";
import { CredentialUsersDialog, type CredentialUsersSubmitValues } from "@/modules/organization/components/credentials/credential-users-dialog";

export type AddCredsSubmitValues = CredentialUsersSubmitValues;

type AddCredsDialogProps = Omit<ComponentProps<typeof CredentialUsersDialog>, "variant">;

export function AddCredsDialog(props: AddCredsDialogProps) {
  return <CredentialUsersDialog {...props} variant="add" />;
}
