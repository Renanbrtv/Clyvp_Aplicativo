export type ReminderSettings = { enabled: boolean; hour: number; minute: number };
export const reminders = {
 supported: false,
 async read(_userId: number): Promise<ReminderSettings> { return { enabled: false, hour: 9, minute: 0 }; },
 async save(_userId: number, _settings: ReminderSettings): Promise<void> { throw new Error('Disponivel no aplicativo instalado no celular.'); },
 async test(): Promise<void> { throw new Error('Disponivel no celular.'); },
 async clear(): Promise<void> {},
};
