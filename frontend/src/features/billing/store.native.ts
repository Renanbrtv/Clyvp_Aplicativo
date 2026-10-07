import { Platform } from 'react-native';
import Constants from 'expo-constants';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';
export interface StorePlan { code: string; price: string; token: unknown }
async function identify(id: string) {
 const key = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
 if (Platform.OS !== 'android' || Constants.appOwnership === 'expo' || !key?.startsWith('goog_')) throw new Error('Compras indisponiveis nesta instalacao. Use a versao Android da Google Play.');
 if (!(await Purchases.isConfigured())) Purchases.configure({ apiKey: key, appUserID: id });
 else if (await Purchases.getAppUserID() !== id) await Purchases.logIn(id);
}
export async function loadStore(id: string): Promise<StorePlan[]> {
 await identify(id);
 const offering = (await Purchases.getOfferings()).current;
 return (offering?.availablePackages ?? []).flatMap(item => {
   const product = item.product.identifier.split(':')[0];
   const code = product === 'clyvo_pro_monthly' ? 'pro' : product === 'clyvo_pro_plus_monthly' ? 'pro_max' : null;
   if (!code || item.product.subscriptionPeriod !== 'P1M') return [];
   return [{ code, price: item.product.priceString, token: item }];
 });
}
export async function buyPlan(plan: StorePlan): Promise<void> { await Purchases.purchasePackage(plan.token as PurchasesPackage); }
export async function restoreStore(id: string): Promise<void> { await identify(id); await Purchases.restorePurchases(); }
