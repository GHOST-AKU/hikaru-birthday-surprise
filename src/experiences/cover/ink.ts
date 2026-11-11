export type Stroke = { x: number; y: number; px: number; py: number; pressure: number };
const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.;float a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+13.7;a*=.5;}return n;}
`;
const flow = `precision highp float; varying vec2 uv;
uniform sampler2D field,target; uniform vec2 pixel; uniform float aspect,time,dt,down,radius,mode;
uniform vec4 stroke; uniform vec4 vortices[8]; ${noise}
void main(){
 vec2 scale=vec2(aspect,1.);vec2 p=uv*scale;
 vec2 q=p*2.8+vec2(time*.035,-time*.024);
 vec2 velocity=vec2(.018+.012*sin(p.y*5.+time*.2),.008*cos(p.x*4.-time*.15));
 velocity+=vec2(fbm(q+vec2(0,.02))-fbm(q-vec2(0,.02)),fbm(q-vec2(.02,0))-fbm(q+vec2(.02,0)))*1.4;
 for(int i=0;i<8;i++){vec2 d=p-vortices[i].xy*scale;float r=dot(d,d);velocity+=vec2(-d.y,d.x)*vortices[i].z*.008/(r+.004)*exp(-r*10.)*vortices[i].w;}
 vec2 drag=(stroke.zw-stroke.xy)*scale;
 velocity+=drag/max(dt,.008)*.12*exp(-dot(p-stroke.zw*scale,p-stroke.zw*scale)/.025)*down;
 velocity+=vec2(.13,.035)*step(.5,mode);
 vec2 back=uv-velocity*dt/scale;
 vec4 f=texture2D(field,clamp(back,vec2(0.),vec2(1.)));
 if(back.x<0.||back.y<0.||back.x>1.||back.y>1.)f=vec4(0.);
 float around=(texture2D(field,back+vec2(pixel.x,0)).r+texture2D(field,back-vec2(pixel.x,0)).r+texture2D(field,back+vec2(0,pixel.y)).r+texture2D(field,back-vec2(0,pixel.y)).r)*.25;
 float rinse=step(.5,mode);
 f.r=max(0.,mix(f.r,around,min(.24,dt*4.))*exp(-dt*(.14+rinse*.7))-dt*.065);
 f.b=max(0.,f.b*exp(-dt*(.22+rinse*1.1))-dt*.065);
 vec2 a=stroke.xy*scale,b=stroke.zw*scale,ab=b-a;
 float t=clamp(dot(p-a,ab)/max(dot(ab,ab),.000001),0.,1.);
 float d=length(p-a-ab*t);float edge=radius*(.87+.22*noise(p*55.+time*.03));
 float droplet=exp(-d*d/(edge*edge*.7))*down;
 float halo=exp(-d*d/(edge*edge*2.7))*down;
 f.r=clamp(f.r+halo*.22,0.,1.);f.b=clamp(f.b+droplet*.48,0.,1.);
 float mask=1.-texture2D(target,uv).r;
 float attached=texture2D(field,uv).g;
 if(mode<1.5){attached=min(mask,attached+max(0.,max(f.r,f.b)-.025)*dt*6.*mask);}
 else {attached=max(0.,f.g*exp(-dt*1.2)-dt*.07);}
 gl_FragColor=vec4(f.r,attached,f.b,1.);
}`;
const render = `precision highp float; varying vec2 uv;
uniform sampler2D field,target;uniform vec2 resolution;uniform float mode,time; ${noise}
void main(){
 vec4 f=texture2D(field,uv);vec2 px=1./resolution;
 float mask=1.-texture2D(target,uv).r;
 float attached=mode<1.5?min(mask,f.g):f.g;
 float liquid=clamp(f.r*.65+f.b*.95,0.,1.);
 vec2 gradient=vec2(texture2D(field,uv+vec2(px.x*2.,0)).b-texture2D(field,uv-vec2(px.x*2.,0)).b,texture2D(field,uv+vec2(0,px.y*2.)).b-texture2D(field,uv-vec2(0,px.y*2.)).b);
 float ripple=sin(uv.x*19.+uv.y*13.+time*.45+fbm(uv*4.+time*.015)*2.);
 vec3 porcelain=vec3(.994,.996,.998)-.004*(1.-ripple);
 vec3 dye=mix(vec3(.13,.19,.23),vec3(.018,.035,.055),smoothstep(.12,.8,liquid));
 vec3 color=mix(porcelain,dye,1.-exp(-liquid*3.4));
 float sheen=pow(max(0.,dot(normalize(vec3(-gradient*18.,1.)),normalize(vec3(-.5,.7,1.)))),22.);
 color+=vec3(.19,.23,.25)*sheen*smoothstep(.08,.7,f.b)*.32;
 color=mix(color,vec3(.025,.045,.06),clamp(attached*1.12,0.,1.));
 gl_FragColor=vec4(color,1.);
}`;
const measure = `precision highp float; varying vec2 uv;uniform sampler2D field,target;
void main(){vec4 f=texture2D(field,uv);float m=1.-texture2D(target,uv).r;gl_FragColor=vec4(min(m,f.g),m,max(f.r,f.b),1.);}`;

type Surface = { texture: WebGLTexture; frame: WebGLFramebuffer };
export class InkRenderer {
  private gl: WebGLRenderingContext;
  private flow: WebGLProgram;
  private render: WebGLProgram;
  private measure: WebGLProgram;
  private meter: Surface;
  private readings = new Uint8Array(96*64*4);
  private fields: Surface[] = [];
  private targets: WebGLTexture[];
  private width = 1;
  private height = 1;
  private simulationWidth = 1;
  private simulationHeight = 1;
  private vortices = new Float32Array(32);
  private vortex = 0;

  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    this.flow = this.program(flow); this.render = this.program(render); this.measure = this.program(measure);
    const buffer = gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    for(const program of [this.flow,this.render,this.measure]){gl.useProgram(program);const at=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);}
    this.targets = [this.texture(),this.texture()];
    const texture=this.texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,96,64,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    const frame=gl.createFramebuffer()!;gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);this.meter={texture,frame};
  }
  private program(fragment: string): WebGLProgram {
    const gl=this.gl;const program=gl.createProgram()!;
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const){const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader error');gl.attachShader(program,shader);gl.deleteShader(shader);}
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Program link failed');return program;
  }
  private texture(): WebGLTexture {
    const gl=this.gl;const texture=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return texture;
  }
  private location(program: WebGLProgram,name:string):WebGLUniformLocation|null {if(!this.uniforms.has(program))this.uniforms.set(program,new Map());const map=this.uniforms.get(program)!;if(!map.has(name))map.set(name,this.gl.getUniformLocation(program,name));return map.get(name)!;}
  private bind(program:WebGLProgram,name:string,texture:WebGLTexture,unit:number):void{const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.location(program,name),unit);}
  resize(width:number,height:number):void{
    const gl=this.gl;this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;
    const scale=Math.min(1,1100/Math.max(width,height));this.simulationWidth=Math.max(1,Math.round(width*scale));this.simulationHeight=Math.max(1,Math.round(height*scale));
    this.fields.forEach(s=>{gl.deleteTexture(s.texture);gl.deleteFramebuffer(s.frame);});this.fields=[];
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    for(let i=0;i<2;i++){const texture=this.texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.simulationWidth,this.simulationHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);const frame=gl.createFramebuffer()!;gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);this.fields.push({texture,frame});}
  }
  setTargets(current:HTMLCanvasElement,previous:HTMLCanvasElement):void{
    const gl=this.gl;gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    [current,previous].forEach((source,i)=>{gl.bindTexture(gl.TEXTURE_2D,this.targets[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);});
  }
  reset():void{const gl=this.gl;this.fields.forEach(s=>{gl.bindFramebuffer(gl.FRAMEBUFFER,s.frame);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);});this.vortices.fill(0);}
  next():void{this.reset();}
  coverage():{coverage:number;ink:number}{
    const gl=this.gl,p=this.measure;gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,this.meter.frame);gl.viewport(0,0,96,64);
    this.bind(p,'field',this.fields[0].texture,0);this.bind(p,'target',this.targets[0],1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.readPixels(0,0,96,64,gl.RGBA,gl.UNSIGNED_BYTE,this.readings);
    let attached=0,mask=0,ink=0;for(let i=0;i<this.readings.length;i+=4){attached+=this.readings[i];mask+=this.readings[i+1];ink+=this.readings[i+2];}
    return {coverage:mask?attached/mask:0,ink:ink/(96*64*255)};
  }
  draw(time:number,dt:number,mode:number,_previousFade:number,stroke:Stroke|null,reduced:boolean,present=true):void{
    const gl=this.gl,p=this.flow;gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,this.fields[1].frame);gl.viewport(0,0,this.simulationWidth,this.simulationHeight);this.bind(p,'field',this.fields[0].texture,0);
    gl.uniform2f(this.location(p,'pixel'),1/this.simulationWidth,1/this.simulationHeight);gl.uniform1f(this.location(p,'aspect'),this.width/this.height);gl.uniform1f(this.location(p,'time'),time);gl.uniform1f(this.location(p,'dt'),dt*(reduced?.45:1));gl.uniform1f(this.location(p,'mode'),mode);this.bind(p,'target',this.targets[0],1);
    gl.uniform1f(this.location(p,'down'),stroke&&mode===0?1:0);gl.uniform1f(this.location(p,'radius'),stroke?.pressure??.04);
    if(stroke){gl.uniform4f(this.location(p,'stroke'),stroke.px,1-stroke.py,stroke.x,1-stroke.y);const at=this.vortex++%8*4;this.vortices.set([stroke.x,1-stroke.y,this.vortex%2?1:-1,1],at);}
    for(let i=3;i<32;i+=4)this.vortices[i]*=Math.exp(-dt*.65);gl.uniform4fv(this.location(p,'vortices[0]'),this.vortices);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);this.fields.reverse();if(!present)return;
    const r=this.render;gl.useProgram(r);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);this.bind(r,'field',this.fields[0].texture,0);this.bind(r,'target',this.targets[0],1);this.bind(r,'previous',this.targets[1],2);gl.uniform2f(this.location(r,'resolution'),this.width,this.height);gl.uniform1f(this.location(r,'mode'),mode);gl.uniform1f(this.location(r,'time'),time);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  destroy():void{const gl=this.gl;this.fields.forEach(s=>{gl.deleteTexture(s.texture);gl.deleteFramebuffer(s.frame);});this.targets.forEach(t=>gl.deleteTexture(t));gl.deleteTexture(this.meter.texture);gl.deleteFramebuffer(this.meter.frame);gl.deleteProgram(this.measure);gl.deleteProgram(this.flow);gl.deleteProgram(this.render);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
