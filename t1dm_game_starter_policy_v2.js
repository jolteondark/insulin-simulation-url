(function(){
'use strict';
if(!window.T1DMGameModelV2)throw new Error('t1dm_game_model_v2.js must load first');
const SCALE=.90;
const rawGenerate=T1DMGameModelV2.generatePatient;
function scaleOrder(o){return{breakfast_u:T1DMGameModelV2.roundUnit(o.breakfast_u*SCALE),lunch_u:T1DMGameModelV2.roundUnit(o.lunch_u*SCALE),dinner_u:T1DMGameModelV2.roundUnit(o.dinner_u*SCALE),basal_u:T1DMGameModelV2.roundUnit(o.basal_u*SCALE)}}
function generatePatient(seed=1){const game=rawGenerate(seed),scaled=scaleOrder(game.case.previous_order_u);game.case.previous_order_u=scaled;game.case.starter_policy={type:'conservative_integer_scale',scale:SCALE};return game}
window.T1DMGameStarterPolicyV2={version:'1.0-90pct-integer',SCALE,scaleOrder,generatePatient};
T1DMGameModelV2.generatePatient=generatePatient;
})();
