const fs=require('fs');
const vm=require('vm');
const path=require('path');

global.window=global;
vm.runInThisContext(fs.readFileSync(path.join(__dirname,'..','discharge_rule.js'),'utf8'),{filename:'discharge_rule.js'});

function rec({scale=false,bg=[100,120,130,140],min=90,max=170}={}){
  return {result:{correction_scale:scale?{enabled:true}:null,bg:{pre_breakfast:bg[0],pre_lunch:bg[1],pre_dinner:bg[2],bedtime:bg[3]},min,max}};
}
function assert(name,cond){if(!cond)throw new Error(name)}

assert('single stable day is not discharge',!DischargeRule.eligible([rec()]));
assert('two stable scale-free days discharge',DischargeRule.eligible([rec(),rec()]));
assert('scale-enabled day blocks discharge',!DischargeRule.eligible([rec(),rec({scale:true})]));
assert('POC >180 blocks discharge',!DischargeRule.stableScaleFreeDay(rec({bg:[100,120,181,140]})));
assert('hidden >250 blocks discharge',!DischargeRule.stableScaleFreeDay(rec({max:251})));
assert('unstable day resets streak',DischargeRule.consecutiveStableScaleFreeDays([rec(),rec({max:251}),rec()])===1);
console.log('public discharge rule smoke: 6/6 passed');
