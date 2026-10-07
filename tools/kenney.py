"""Zet een selectie Kenney-modellen (CC0, kenney.nl) om naar models/kenney.bin + models/kenney.json.
Kleuren worden in de punten gebakken (kleurkaart of materiaalkleur), bladeren krijgen natuurlijke tinten en zachte normalen.
Gebruik: python3 tools/kenney.py <map met uitgepakte Kenney-pakketten>"""
import json,struct,sys,os,math
from PIL import Image
SRC=sys.argv[1];OUT=os.path.join(os.path.dirname(__file__),'..','models')
NAT=os.path.join(SRC,'kenney_nature-kit','Models','GLTF format');CAR=os.path.join(SRC,'kenney_car-kit','Models','GLB format')
SEL={'loof':['tree_default','tree_default_dark','tree_detailed','tree_detailed_dark','tree_fat','tree_oak','tree_oak_dark','tree_plateau','tree_simple','tree_small','tree_tall','tree_thin'],
     'herfst':['tree_default_fall','tree_oak_fall','tree_fat_fall'],
     'naald':['tree_pineDefaultA','tree_pineDefaultB','tree_pineRoundA','tree_pineRoundC','tree_pineTallA','tree_pineTallB','tree_cone','tree_pineSmallA'],
     'struik':['plant_bush','plant_bushDetailed','plant_bushLarge','plant_bushSmall'],
     'rots':['rock_largeA','rock_largeB','rock_largeC','rock_tallA','rock_tallB'],
     'hout':['stump_old','stump_round','log','log_stack'],
     'bloem':['flower_redA','flower_yellowA','flower_purpleA'],
     'auto':['sedan','suv','van','hatchback-sports','delivery','tractor','truck']}
# natuurlijke kleuren in plaats van Kenney's turquoise en oranje
RECOL={'leafsGreen':'#5aa83c','leafsDark':'#3f7f3a','grass':'#6db84a','woodBark':'#7a5236','woodBarkDark':'#5e3f29','woodInner':'#d9b98a','dirt':'#8a6a4a','stone':'#8f8a86','stoneDark':'#77726e'}
SOFT={'leafsGreen','leafsDark','grass','leafsFall','leafsOrange','leafsRed','leafsYellow'}
hx=lambda h:[int(h[i:i+2],16)/255 for i in (1,3,5)]
def mat4(n):
  if 'matrix' in n:m=n['matrix'];return [[m[c*4+r] for c in range(4)] for r in range(4)]
  t=n.get('translation',[0,0,0]);q=n.get('rotation',[0,0,0,1]);s=n.get('scale',[1,1,1]);x,y,z,w=q
  R=[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
  return [[R[r][0]*s[0],R[r][1]*s[1],R[r][2]*s[2],t[r]] for r in range(3)]+[[0,0,0,1]]
def mul(A,B):return [[sum(A[r][k]*B[k][c] for k in range(4)) for c in range(4)] for r in range(4)]
def load(path):
  b=open(path,'rb').read();jl=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+jl]);o=20+jl;bl=struct.unpack('<I',b[o:o+4])[0];bin_=b[o+8:o+8+bl];return j,bin_
def acc(j,bin_,i):
  a=j['accessors'][i];bv=j['bufferViews'][a['bufferView']];ct={5126:('f',4),5123:('H',2),5125:('I',4),5121:('B',1)}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
  st=bv.get('byteStride',ct[1]*n);base=bv.get('byteOffset',0)+a.get('byteOffset',0)
  return [struct.unpack_from('<'+ct[0]*n,bin_,base+k*st) for k in range(a['count'])]
def model(path,cat):
  j,bin_=load(path);imgs={}
  def texc(mi):
    m=j['materials'][mi];pb=m.get('pbrMetallicRoughness',{})
    if 'baseColorTexture' not in pb:return None
    ti=pb['baseColorTexture']['index'];im=j['textures'][ti]['source']
    if im not in imgs:
      I=j['images'][im]
      if 'uri' in I:imgs[im]=Image.open(os.path.join(os.path.dirname(path),I['uri'])).convert('RGB')
      else:
        bv=j['bufferViews'][I['bufferView']];import io;imgs[im]=Image.open(io.BytesIO(bin_[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])).convert('RGB')
    return imgs[im]
  P=[];N=[];C=[];I=[];soft=[]
  def walk(ni,M):
    n=j['nodes'][ni];W=mul(M,mat4(n))
    if 'mesh' in n:
      for pr in j['meshes'][n['mesh']]['primitives']:
        at=pr['attributes'];pos=acc(j,bin_,at['POSITION']);nor=acc(j,bin_,at['NORMAL']) if 'NORMAL' in at else [(0,1,0)]*len(pos)
        uv=acc(j,bin_,at['TEXCOORD_0']) if 'TEXCOORD_0' in at else None
        mi=pr.get('material');mname=j['materials'][mi].get('name','') if mi is not None else ''
        pb=j['materials'][mi].get('pbrMetallicRoughness',{}) if mi is not None else {}
        img=texc(mi) if mi is not None else None
        base=hx(RECOL[mname]) if mname in RECOL else (pb.get('baseColorFactor',[1,1,1,1])[:3])
        b0=len(P)
        for k,(x,y,z) in enumerate(pos):
          P.append([W[r][0]*x+W[r][1]*y+W[r][2]*z+W[r][3] for r in range(3)])
          nx,ny,nz=nor[k];v=[W[r][0]*nx+W[r][1]*ny+W[r][2]*nz for r in range(3)];l=math.sqrt(sum(t*t for t in v)) or 1;N.append([t/l for t in v])
          if img is not None and uv:
            u,vv=uv[k];px=img.getpixel((min(img.width-1,max(0,int(u%1*img.width))),min(img.height-1,max(0,int(vv%1*img.height)))));C.append([px[0]/255,px[1]/255,px[2]/255])
          else:C.append(list(base))
          soft.append(mname in SOFT or mname.startswith('leafs'))
        idx=acc(j,bin_,pr['indices']) if 'indices' in pr else [(k,) for k in range(len(pos))]
        I.extend(b0+t[0] for t in idx)
    for c in n.get('children',[]):walk(c,W)
  for ni in j['scenes'][j.get('scene',0)]['nodes']:walk(ni,[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]])
  # bladeren: zachte normalen (punten op dezelfde plek middelen) en een verloop van donker onder naar licht boven
  ys=[p[1] for p in P];y0,y1=min(ys),max(ys)
  acc_={}
  for k,p in enumerate(P):
    if soft[k]:key=tuple(round(t,3) for t in p);a=acc_.setdefault(key,[0,0,0]);a[0]+=N[k][0];a[1]+=N[k][1];a[2]+=N[k][2]
  for k,p in enumerate(P):
    if soft[k]:
      a=acc_[tuple(round(t,3) for t in p)];l=math.sqrt(sum(t*t for t in a)) or 1;N[k]=[t/l for t in a]
      f=.72+.42*(p[1]-y0)/((y1-y0) or 1);C[k]=[min(1,c*f) for c in C[k]]
  xs=[p[0] for p in P];zs=[p[2] for p in P]
  return {'cat':cat,'P':P,'N':N,'C':C,'I':I,'box':[min(xs),y0,min(zs),max(xs),y1,max(zs)]}
out=bytearray();man={}
for cat,names in SEL.items():
  for nm in names:
    m=model(os.path.join(CAR if cat=='auto' else NAT,nm+'.glb'),cat)
    while len(out)%4:out.append(0)
    e={'cat':cat,'v':len(m['P']),'i':len(m['I']),'box':[round(t,4) for t in m['box']]}
    e['p']=len(out);out+=struct.pack('<%df'%(3*e['v']),*[t for p in m['P'] for t in p])
    e['n']=len(out);out+=struct.pack('<%db'%(3*e['v']),*[max(-127,min(127,round(t*127))) for nn in m['N'] for t in nn])
    e['c']=len(out);out+=struct.pack('<%dB'%(3*e['v']),*[max(0,min(255,round(t*255))) for c in m['C'] for t in c])
    while len(out)%2:out.append(0)
    e['x']=len(out);out+=struct.pack('<%dH'%e['i'],*m['I'])
    man[nm]=e
os.makedirs(OUT,exist_ok=True)
open(os.path.join(OUT,'kenney.bin'),'wb').write(out)
json.dump({'bron':'Kenney (kenney.nl), CC0','modellen':man},open(os.path.join(OUT,'kenney.json'),'w'),separators=(',',':'))
print(len(man),'modellen,',round(len(out)/1024),'kB')
