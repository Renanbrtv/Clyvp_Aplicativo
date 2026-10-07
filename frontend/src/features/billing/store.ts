export interface StorePlan { code: string; price: string; token: unknown }
export async function loadStore(_id: string): Promise<StorePlan[]> { return []; }
export async function buyPlan(_plan: StorePlan): Promise<void> { throw new Error('Assinaturas disponiveis no aplicativo Android instalado pela Google Play.'); }
export async function restoreStore(_id: string): Promise<void> { throw new Error('Restaure suas compras no aplicativo Android.'); }
