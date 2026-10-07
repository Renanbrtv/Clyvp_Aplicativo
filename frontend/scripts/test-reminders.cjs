// Contrato local com SDK simulado; nao substitui teste no Android.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const scheduled = new Map(), stored = new Map();
let granted = true;
const sdk = {
 setNotificationHandler() {}, AndroidImportance: {DEFAULT: 3}, IosAuthorizationStatus: {PROVISIONAL: 3},
 SchedulableTriggerInputTypes: {DAILY: 'daily', TIME_INTERVAL:'timeInterval'},
 async setNotificationChannelAsync() {}, async requestPermissionsAsync() { return { granted }; }, async getPermissionsAsync() { return { granted }; },
 async cancelScheduledNotificationAsync(id) { scheduled.delete(id); },
 async scheduleNotificationAsync(value) { scheduled.set(value.identifier, value); return value.identifier; },
 async getAllScheduledNotificationsAsync() { return [...scheduled.values()]; }, async dismissAllNotificationsAsync() {},
};
const storage = { async getItemAsync(k) { return stored.get(k) ?? null; }, async setItemAsync(k,v) { stored.set(k,v); }, async deleteItemAsync(k) { stored.delete(k); } };
const exportsObject = {};
const source = fs.readFileSync(path.resolve(__dirname,'../src/features/notifications/reminders.native.ts'),'utf8');
vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, { exports: exportsObject, require: name => ({'react-native':{Platform:{OS:'android'}},'expo-notifications':sdk,'expo-secure-store':storage})[name], Error, JSON, Number, Promise });
(async()=>{
 const reminders=exportsObject.reminders;
 await reminders.save(1,{enabled:true,hour:9,minute:30});assert.equal(scheduled.size,1);assert.equal((await reminders.read(1)).enabled,true);
 await reminders.save(1,{enabled:true,hour:10,minute:0});assert.equal(scheduled.size,1);assert.equal([...scheduled.values()][0].trigger.hour,10);
 granted=false;await assert.rejects(()=>reminders.test(),/permissao/);assert.equal((await reminders.read(1)).enabled,false);
 granted=true;await reminders.read(2);assert.equal(scheduled.size,0);assert.equal(stored.size,0);
 await reminders.test();assert.equal(scheduled.size,1);await reminders.clear();assert.equal(scheduled.size,0);
 await assert.rejects(()=>reminders.save(1,{enabled:true,hour:25,minute:0}),/horario/);
 await reminders.save(1,{enabled:true,hour:8,minute:0});await reminders.save(1,{enabled:false,hour:8,minute:0});assert.equal(scheduled.size,0);
 console.log('Lembretes: 7 cenarios aprovados com SDK simulado. Teste em aparelho ainda necessario.');
})().catch(e=>{console.error(e);process.exitCode=1});
