"use client";

import { createContext, useContext } from "react";

type Actions = { newCampaign: () => void; editProfile: () => void };

export const ShellActions = createContext<Actions>({ newCampaign() {}, editProfile() {} });
export const useShellActions = () => useContext(ShellActions);
