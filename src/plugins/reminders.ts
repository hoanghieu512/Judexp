import { registerPlugin } from '@capacitor/core';

export interface ReminderSchedule {
  notificationId: number;
  reminderId: string;
  kind: string;
  key: string;
  label: string;
  lookedUpAt: string;
  expiresAt: string;
  /** Epoch milliseconds. */
  at: number;
}

export interface ReminderNativePlugin {
  permission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  /** Replaces any alarm and any shown notification with the same notificationId. */
  schedule(options: ReminderSchedule): Promise<void>;
  cancel(options: { notificationId: number }): Promise<void>;
}

export const ReminderNative = registerPlugin<ReminderNativePlugin>('Reminder');
