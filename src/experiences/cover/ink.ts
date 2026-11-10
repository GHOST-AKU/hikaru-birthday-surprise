export type Stroke = { x: number; y: number; px: number; py: number; pressure: number };
const vertex = `attribute vec2 position; varying vec2 uv; void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const noise = `
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.;float a=.5;for(int i=0;i<4;i++){n+=a*noise(p);p=p*2.03+13.7;a*=.5;}return n;}
`;
const flow = `precision highp float; varying vec2 uv; uniform sampler2D field; uniform vec2 pixel; uniform float aspect,time,dt,down,radius,clearReveal,rinse; uniform vec4 stroke; uniform vec4 vortices[8]; ${noise}
void main(){
 vec2 scale=vec2(aspect,1.);vec2 p=uv*scale;
 vec2 q=p*3.6+vec2(time*.035,-time*.022);
 vec2 velocity=vec2(fbm(q+vec2(0,.015))-fbm(q-vec2(0,.015)),fbm(q-vec2(.015,0))-fbm(q+vec2(.015,0)))*1.15;
 for(int i=0;i<8;i++){vec2 d=p-vortices[i].xy*scale;float r=dot(d,d);velocity+=vec2(-d.y,d.x)*vortices[i].z*.004/(r+.0025)*exp(-r*7.)*vortices[i].w;}
 vec2 back=clamp(uv-velocity*dt/scale,vec2(0.),vec2(1.));
 vec4 f=texture2D(field,back);float around=(texture2D(field,back+vec2(pixel.x,0)).r+texture2D(field,back-vec2(pixel.x,0)).r+texture2D(field,back+vec2(0,pixel.y)).r+texture2D(field,back-vec2(0,pixel.y)).r)*.25;
 f.r=mix(f.r,around,.025)*pow(.9995,dt*60.);f.g*=1.-clearReveal;f.r*=rinse;
 vec2 a=stroke.xy*scale,b=stroke.zw*scale;vec2 ab=b-a;float t=clamp(dot(p-a,ab)/max(dot(ab,ab),.000001),0.,1.);float d=length(p-a-ab*t);
 float grain=fbm(p*110.+time*.03);float edge=radius*(.65+grain*.65);vec2 direction=normalize(ab+vec2(.00001));float bristle=noise(vec2(dot(p-a,vec2(-direction.y,direction.x))*900.,dot(p-a,direction)*70.));float wash=((1.-smoothstep(edge*.28,edge,d))*(.28+bristle*.9)+exp(-d*d/(edge*edge*2.))* .10)*down;
 f.r=clamp(f.r+wash*(.7+grain*.35)*(1.-f.r*.7),0.,1.);f.g=max(f.g,(1.-smoothstep(edge*.4,edge*2.6,d))*down);f.b=max(f.b*.98,wash);
 gl_FragColor=vec4(f.rgb,1.);
}`;
const render = `precision highp float; varying vec2 uv; uniform sampler2D field,target,previous; uniform vec2 resolution; uniform float progress,previousFade,time; ${noise}
void main(){
 vec4 f=texture2D(field,uv);float paper=noise(uv*resolution*.075);float fiber=hash(floor(uv*resolution));
 vec3 base=vec3(.969,.955,.921)+(paper-.5)*.025+(fiber-.5)*.012;
 float grain=paper;float reveal=smoothstep(grain*.6,grain*.6+.34,progress*1.1);reveal=max(reveal,f.g*.78);
 vec2 rough=vec2(grain-.5,fiber-.5)*1.5/resolution;float motif=(1.-texture2D(target,uv+rough).r)*reveal;
 float old=(1.-texture2D(previous,uv).r)*smoothstep(grain*.65,grain*.65+.32,previousFade);
 float granulation=noise(uv*resolution*.42);float pigment=max(0.,pow(f.r,.72)-grain*.18-granulation*.075);float wet=pigment*(mix(.95,.30,smoothstep(.55,1.,progress))+.22*f.b);float dry=.93+granulation*.07;
 float ink=1.-(1.-motif*.95*dry)*(1.-old*.94*dry)*(1.-wet);
 gl_FragColor=vec4(base*(1.-ink*.95),1.);
}`;

type Surface = { texture: WebGLTexture; frame: WebGLFramebuffer };
export class InkRenderer {
  private gl: WebGLRenderingContext;
  private flow: WebGLProgram;
  private render: WebGLProgram;
  private fields: Surface[] = [];
  private targets: WebGLTexture[];
  private width = 1;
  private height = 1;
  private simulationWidth = 1;
  private simulationHeight = 1;
  private vortices = new Float32Array(32);
  private vortex = 0;
  private clearReveal = 0;
  private rinsing = 0;
  private uniforms = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL unavailable');
    this.gl = gl;
    this.flow = this.program(flow); this.render = this.program(render);
    const buffer = gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    for(const program of [this.flow,this.render]){gl.useProgram(program);const at=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);}
    this.targets = [this.texture(),this.texture()];
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
    const scale=Math.min(1,640/Math.max(width,height));this.simulationWidth=Math.max(1,Math.round(width*scale));this.simulationHeight=Math.max(1,Math.round(height*scale));
    this.fields.forEach(s=>{gl.deleteTexture(s.texture);gl.deleteFramebuffer(s.frame);});this.fields=[];
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    for(let i=0;i<2;i++){const texture=this.texture();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,this.simulationWidth,this.simulationHeight,0,gl.RGBA,gl.UNSIGNED_BYTE,null);const frame=gl.createFramebuffer()!;gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);this.fields.push({texture,frame});}
  }
  setTargets(current:HTMLCanvasElement,previous:HTMLCanvasElement):void{
    const gl=this.gl;gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    [current,previous].forEach((source,i)=>{gl.bindTexture(gl.TEXTURE_2D,this.targets[i]);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);});
  }
  reset():void{const gl=this.gl;this.fields.forEach(s=>{gl.bindFramebuffer(gl.FRAMEBUFFER,s.frame);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);});this.vortices.fill(0);this.rinsing=0;}
  next():void{this.clearReveal=1;this.rinsing=2;}
  draw(time:number,dt:number,progress:number,previousFade:number,stroke:Stroke|null,reduced:boolean,present=true):void{
    const gl=this.gl,p=this.flow;gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,this.fields[1].frame);gl.viewport(0,0,this.simulationWidth,this.simulationHeight);this.bind(p,'field',this.fields[0].texture,0);
    gl.uniform2f(this.location(p,'pixel'),1/this.simulationWidth,1/this.simulationHeight);gl.uniform1f(this.location(p,'aspect'),this.width/this.height);gl.uniform1f(this.location(p,'time'),time);gl.uniform1f(this.location(p,'dt'),reduced?0:dt);gl.uniform1f(this.location(p,'clearReveal'),this.clearReveal);this.clearReveal=0;this.rinsing=Math.max(0,this.rinsing-dt);gl.uniform1f(this.location(p,'rinse'),this.rinsing>0?Math.exp(-dt*1.8):1);
    gl.uniform1f(this.location(p,'down'),stroke?1:0);gl.uniform1f(this.location(p,'radius'),stroke?.pressure??.04);
    if(stroke){gl.uniform4f(this.location(p,'stroke'),stroke.px,1-stroke.py,stroke.x,1-stroke.y);const at=this.vortex++%8*4;this.vortices.set([stroke.x,1-stroke.y,this.vortex%2?1:-1,1],at);}
    for(let i=3;i<32;i+=4)this.vortices[i]*=Math.exp(-dt*.65);gl.uniform4fv(this.location(p,'vortices[0]'),this.vortices);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);this.fields.reverse();if(!present)return;
    const r=this.render;gl.useProgram(r);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);this.bind(r,'field',this.fields[0].texture,0);this.bind(r,'target',this.targets[0],1);this.bind(r,'previous',this.targets[1],2);gl.uniform2f(this.location(r,'resolution'),this.width,this.height);gl.uniform1f(this.location(r,'progress'),progress);gl.uniform1f(this.location(r,'previousFade'),previousFade);gl.uniform1f(this.location(r,'time'),time);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  destroy():void{const gl=this.gl;this.fields.forEach(s=>{gl.deleteTexture(s.texture);gl.deleteFramebuffer(s.frame);});this.targets.forEach(t=>gl.deleteTexture(t));gl.deleteProgram(this.flow);gl.deleteProgram(this.render);gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
