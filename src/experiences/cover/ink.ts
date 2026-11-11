export type Stroke = { x: number; y: number; px: number; py: number; pressure: number };
const vertex = `#version 300 es
in vec2 position; out vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const header = `#version 300 es
precision highp float;
precision highp sampler2D;
in vec2 uv;out vec4 color;
`;
const dynamics = `
uniform sampler2D field;uniform vec2 pixel;uniform float aspect,time,dt,mode,washTime,down,radius;
uniform vec4 stroke;uniform vec4 vortices[8];
vec2 velocity(vec2 point){
 vec2 p=point*vec2(aspect,1.);
 vec2 v=vec2(.009,.003);
 v+=vec2(.019*sin(p.x*3.+time*.08)*cos(p.y*4.-time*.06),-.01425*cos(p.x*3.+time*.08)*sin(p.y*4.-time*.06));
 v+=vec2(.009*sin(p.x*11.-time*.12)*cos(p.y*9.+time*.07),-.011*cos(p.x*11.-time*.12)*sin(p.y*9.+time*.07));
 for(int i=0;i<8;i++){
  vec2 d=p-vortices[i].xy*vec2(aspect,1.);float r=dot(d,d);
  v+=vec2(-d.y,d.x)*vortices[i].z*.005/(r+.0018)*exp(-r*16.)*vortices[i].w;
 }
 vec2 drag=(stroke.zw-stroke.xy)*vec2(aspect,1.);
 vec2 d=p-stroke.zw*vec2(aspect,1.);
 v+=drag/max(dt,.008)*.16*exp(-dot(d,d)/.012)*down;
 float flood=smoothstep(0.,1.2,washTime)*mode;
 v+=vec2(.24+.035*sin(p.y*12.-time),.016*sin(p.x*7.+time*.6))*flood;
 return v/vec2(aspect,1.);
}
vec4 readField(vec2 at){
 if(any(lessThan(at,vec2(0.)))||any(greaterThan(at,vec2(1.))))return vec4(0.);
 return texture(field,at);
}
`;
const advect = header+dynamics+`
void main(){color=readField(uv-velocity(uv)*dt);}
`;
const update = header+dynamics+`
uniform sampler2D transported,target;
void main(){
 vec2 v=velocity(uv);vec2 back=uv-v*dt;
 vec4 carried=texture(transported,uv);
 vec4 reverse=texture(transported,clamp(uv+v*dt,vec2(0.),vec2(1.)));
 vec2 cell=(floor(back/pixel-.5)+.5)*pixel;
 vec4 a=readField(cell),b=readField(cell+vec2(pixel.x,0.)),c=readField(cell+vec2(0.,pixel.y)),d=readField(cell+pixel);
 vec4 f=clamp(carried+.5*(texture(field,uv)-reverse),min(min(a,b),min(c,d)),max(max(a,b),max(c,d)));
 if(any(lessThan(back,vec2(0.)))||any(greaterThan(back,vec2(1.))))f=vec4(0.);
 float around=(a.r+b.r+c.r+d.r)*.25;
 f.r=max(0.,mix(f.r,around,min(.025,dt*.45))*exp(-dt*(.16+mode*.3))-dt*.009);
 f.b=max(0.,f.b*exp(-dt*(.085+mode*.38))-dt*.004);
 vec2 scale=vec2(aspect,1.);vec2 p=uv*scale;
 vec2 start=stroke.xy*scale,end=stroke.zw*scale,line=end-start;
 float along=clamp(dot(p-start,line)/max(dot(line,line),.000001),0.,1.);
 vec2 delta=p-start-line*along;
 float edge=radius*(1.+.045*sin(p.x*130.+p.y*96.)+.025*sin(p.y*210.-p.x*71.));
 float dist=length(delta);
 float body=(1.-smoothstep(edge*.82,edge*1.04,dist))*down;
 float halo=exp(-dist*dist/(edge*edge*1.15))*down;
 f.b=min(1.5,f.b+body*.36);f.r=min(1.,f.r+halo*.045);
 float mask=1.-texture(target,uv).r;
 float attached=texture(field,uv).g;
 if(mode<.5){
  if(mask>.004)attached=min(1.,attached+max(0.,max(f.r,f.b)-.025)*dt*5.);
  else attached=0.;
 }else{
  float front=(washTime-1.35)*.24+.045*sin(uv.y*15.+time*.6)+.018*sin(uv.y*39.-time);
  float release=smoothstep(uv.x-.045,uv.x+.045,front)*(1.-exp(-dt*5.));
  f.b+=attached*mask*release*.9;
  attached*=1.-release;
 }
 color=vec4(f.r,attached,f.b,1.);
}`;
const display = header+`
uniform sampler2D field,target;uniform vec2 pixel;uniform float time;
void main(){
 vec4 f=texture(field,uv);
 float mask=1.-texture(target,uv).r;
 float pigment=f.r*.65+f.b;
 vec2 gradient=vec2(texture(field,uv+vec2(pixel.x,0.)).b-texture(field,uv-vec2(pixel.x,0.)).b,texture(field,uv+vec2(0.,pixel.y)).b-texture(field,uv-vec2(0.,pixel.y)).b);
 float water=sin(uv.x*13.+uv.y*8.+time*.24)*sin(uv.y*7.-time*.18);
 vec3 base=vec3(.997,.998,1.)-.002*(1.-water);
 float opacity=1.-exp(-max(0.,pigment-.007)*4.1);
 vec3 ink=mix(vec3(.13,.19,.24),vec3(.009,.018,.025),smoothstep(.08,.6,pigment));
 vec3 result=mix(base,ink,opacity);
 float specular=pow(max(0.,dot(normalize(vec3(-gradient*12.,1.)),normalize(vec3(-.5,.6,1.)))),30.);
 result+=vec3(.11,.15,.18)*specular*smoothstep(.08,.55,f.b)*.35;
 result=mix(result,vec3(.015,.025,.033),clamp(f.g*mask,0.,1.));
 color=vec4(result,1.);
}`;
const measure = header+`
uniform sampler2D field,target;
void main(){vec4 f=texture(field,uv);float mask=1.-texture(target,uv).r;color=vec4(f.g*mask,mask,min(1.,max(f.r,f.b)),1.);}
`;
type Surface = { texture: WebGLTexture; frame: WebGLFramebuffer };
export class InkRenderer {
  private gl: WebGL2RenderingContext;
  private advect: WebGLProgram;
  private update: WebGLProgram;
  private display: WebGLProgram;
  private measure: WebGLProgram;
  private meter: Surface;
  private target: WebGLTexture;
  private fields: Surface[]=[];
  private buffer: WebGLBuffer;
  private floatState: boolean;
  private readings=new Uint8Array(96*64*4);
  private width=1;
  private height=1;
  private simWidth=1;
  private simHeight=1;
  private vortices=new Float32Array(32);
  private vortex=0;
  private uniforms=new Map<WebGLProgram,Map<string,WebGLUniformLocation|null>>();
  constructor(private canvas: HTMLCanvasElement){
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    if(!gl)throw new Error('WebGL2 unavailable');
    this.gl=gl;this.floatState=!!gl.getExtension('EXT_color_buffer_float');
    this.advect=this.program(advect);this.update=this.program(update);this.display=this.program(display);this.measure=this.program(measure);
    this.buffer=gl.createBuffer()!;gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    for(const program of [this.advect,this.update,this.display,this.measure]){
      gl.useProgram(program);const at=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);
    }
    this.target=this.texture();this.meter=this.surface(96,64,false);
  }
  private program(fragment:string):WebGLProgram{
    const gl=this.gl,p=gl.createProgram()!;
    for(const [type,source] of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]] as const){
      const shader=gl.createShader(type)!;gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader)||'Shader compilation failed');
      gl.attachShader(p,shader);gl.deleteShader(shader);
    }
    gl.bindAttribLocation(p,0,'position');gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||'Shader link failed');return p;
  }
  private texture():WebGLTexture{
    const gl=this.gl,t=gl.createTexture()!;gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;
  }
  private surface(width:number,height:number,float:boolean):Surface{
    const gl=this.gl,texture=this.texture();
    gl.texImage2D(gl.TEXTURE_2D,0,float?gl.RGBA16F:gl.RGBA8,width,height,0,gl.RGBA,float?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
    const frame=gl.createFramebuffer()!;gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw new Error('Ink buffer unavailable');
    gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);return {texture,frame};
  }
  private location(program:WebGLProgram,name:string):WebGLUniformLocation|null{
    if(!this.uniforms.has(program))this.uniforms.set(program,new Map());const map=this.uniforms.get(program)!;
    if(!map.has(name))map.set(name,this.gl.getUniformLocation(program,name));return map.get(name)!;
  }
  private bind(program:WebGLProgram,name:string,texture:WebGLTexture,unit:number):void{
    const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.location(program,name),unit);
  }
  resize(width:number,height:number):void{
    const gl=this.gl;this.width=width;this.height=height;this.canvas.width=width;this.canvas.height=height;
    const old=this.fields,oldWidth=this.simWidth,oldHeight=this.simHeight;
    const scale=Math.min(1,2560/Math.max(width,height),Math.sqrt(3600000/(width*height)),gl.getParameter(gl.MAX_TEXTURE_SIZE)/Math.max(width,height));
    this.simWidth=Math.max(1,Math.round(width*scale));this.simHeight=Math.max(1,Math.round(height*scale));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
    this.fields=Array.from({length:3},()=>this.surface(this.simWidth,this.simHeight,this.floatState));
    if(old.length){
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER,old[0].frame);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,this.fields[0].frame);
      gl.blitFramebuffer(0,0,oldWidth,oldHeight,0,0,this.simWidth,this.simHeight,gl.COLOR_BUFFER_BIT,gl.LINEAR);
    }
    old.forEach(s=>{gl.deleteTexture(s.texture);gl.deleteFramebuffer(s.frame);});
    this.canvas.dataset.precision=this.floatState?'float16':'unorm8';
  }
  setTargets(current:HTMLCanvasElement,_previous:HTMLCanvasElement):void{
    const gl=this.gl;gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.bindTexture(gl.TEXTURE_2D,this.target);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,current);
  }
  reset():void{const gl=this.gl;this.fields.forEach(s=>{gl.bindFramebuffer(gl.FRAMEBUFFER,s.frame);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);});this.vortices.fill(0);}
  next():void{this.reset();}
  coverage():{coverage:number;ink:number}{
    const gl=this.gl,p=this.measure;gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,this.meter.frame);gl.viewport(0,0,96,64);
    this.bind(p,'field',this.fields[0].texture,0);this.bind(p,'target',this.target,1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    gl.readPixels(0,0,96,64,gl.RGBA,gl.UNSIGNED_BYTE,this.readings);
    let attached=0,mask=0,ink=0;for(let i=0;i<this.readings.length;i+=4){attached+=this.readings[i];mask+=this.readings[i+1];ink+=this.readings[i+2];}
    return {coverage:mask?attached/mask:0,ink:ink/(96*64*255)};
  }
  draw(time:number,dt:number,mode:number,washTime:number,stroke:Stroke|null,reduced:boolean,present=true):void{
    const gl=this.gl;
    if(stroke){const at=this.vortex++%8*4;this.vortices.set([stroke.x,1-stroke.y,this.vortex%2?1:-1,1],at);}
    for(let i=3;i<32;i+=4)this.vortices[i]*=Math.exp(-dt*.55);
    for(const [program,destination] of [[this.advect,this.fields[1]],[this.update,this.fields[2]]] as const){
      gl.useProgram(program);gl.bindFramebuffer(gl.FRAMEBUFFER,destination.frame);gl.viewport(0,0,this.simWidth,this.simHeight);
      this.bind(program,'field',this.fields[0].texture,0);
      if(program===this.update){this.bind(program,'target',this.target,1);this.bind(program,'transported',this.fields[1].texture,2);}
      else {gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,null);}
      gl.uniform2f(this.location(program,'pixel'),1/this.simWidth,1/this.simHeight);
      for(const [name,value] of Object.entries({aspect:this.width/this.height,time,dt:dt*(reduced?.45:1),mode,washTime,down:stroke&&mode===0?1:0,radius:stroke?.pressure??.025}))gl.uniform1f(this.location(program,name),value);
      gl.uniform4f(this.location(program,'stroke'),stroke?.px??0,1-(stroke?.py??1),stroke?.x??0,1-(stroke?.y??1));
      gl.uniform4fv(this.location(program,'vortices[0]'),this.vortices);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    }
    [this.fields[0],this.fields[2]]=[this.fields[2],this.fields[0]];
    if(!present)return;
    const p=this.display;gl.useProgram(p);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,this.width,this.height);
    this.bind(p,'field',this.fields[0].texture,0);this.bind(p,'target',this.target,1);
    gl.uniform2f(this.location(p,'pixel'),1/this.simWidth,1/this.simHeight);gl.uniform1f(this.location(p,'time'),time);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  }
  destroy():void{
    const gl=this.gl;[...this.fields,this.meter].forEach(s=>{gl.deleteTexture(s.texture);gl.deleteFramebuffer(s.frame);});
    gl.deleteTexture(this.target);gl.deleteBuffer(this.buffer);[this.advect,this.update,this.display,this.measure].forEach(p=>gl.deleteProgram(p));gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
