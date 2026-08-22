const fs=require('fs'),cp=require('child_process');
let src=fs.readFileSync('validation_v083_biphasic_requirement_state_node.js','utf8');
src=src.replace("const widths=[30,45,60,90],couplings=[.36,.48,.60,.72];","const widths=[120,150,180,210,240],couplings=[.24,.30,.36,.42,.48];");
src=src.replaceAll('v083_biphasic_requirement_state_result.json','v083_biphasic_requirement_state_wide_result.json');
src=src.replace("v0.81 S_I+D with biphasic zero-DC basal requirement state","v0.81 S_I+D with wide biphasic zero-DC basal requirement state");
fs.writeFileSync('/tmp/v083wide.js',src);cp.execFileSync(process.execPath,['/tmp/v083wide.js'],{cwd:process.cwd(),stdio:'inherit',env:{...process.env,N:process.env.N||'120'}});