const assert=require('assert');
const summary=require('../latest_insulin_summary.js');

const rec={
  order:{breakfast_u:4,lunch_u:5,dinner_u:6,basal_u:8},
  result:{correction_doses_u:{breakfast:3,lunch:0,dinner:2}}
};
const html=summary.buildHtml(rec);
assert(html.includes('7 U'),'breakfast should show actual 4+3=7 U');
assert(html.includes('定時 4 + scale 3'),'breakfast breakdown should be visible');
assert(html.includes('5 U'),'lunch should remain scheduled dose when no correction is used');
assert(html.includes('8 U'),'dinner should show actual 6+2=8 U');
assert(html.includes('眠前 basal'),'basal should remain visible');
assert.strictEqual(summary.correctionFor(rec,'dinner_u'),2);

const noScale={order:{breakfast_u:4,lunch_u:5,dinner_u:6,basal_u:8},result:{}};
const noScaleHtml=summary.buildHtml(noScale);
assert(noScaleHtml.includes('定時 4'));
assert(!noScaleHtml.includes('scale 0'));
console.log('latest_insulin_summary_smoke: PASS');
