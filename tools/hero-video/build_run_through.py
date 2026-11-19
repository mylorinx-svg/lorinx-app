import numpy as np, cv2, subprocess, sys
from scipy import ndimage as ndi
def load(i): return cv2.cvtColor(cv2.imread('q_%03d.png'%i), cv2.COLOR_BGR2RGB)
P=load(121).astype(np.float32)
F1=load(1).astype(np.float32)
# the "empty" last frame still holds a motion-blurred red leg at the right edge; frame 1 has a clean copy of that corner
cm=np.zeros((720,1280),np.float32); cm[400:640,1130:1280]=1; cm=cv2.GaussianBlur(cm,(0,0),6)[...,None]
cm[:,:1130]=0
P=(P*(1-cm)+F1*cm)
WM=(slice(650,708),slice(1085,1265))     # the Kling watermark is left exactly as generated
def comps(F,thr=22):
    d=np.abs(F-P).max(2)
    m=(d>thr).astype(np.uint8); m[WM]=0
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
    lab,n=ndi.label(m)
    if n:
        sizes=ndi.sum(m,lab,range(1,n+1)); keep=np.zeros(n+1,bool); keep[1:]=sizes>1200; m=keep[lab].astype(np.uint8)
    m=ndi.binary_fill_holes(m).astype(np.uint8)
    m=cv2.dilate(m,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(3,3))); m[WM]=0
    lab,n=ndi.label(m); body=np.zeros_like(m)
    for k in range(1,n+1):
        sel=lab==k; ys,xs=np.where(sel)
        reddish=float((F[...,0][sel]-F[...,2][sel]).mean())>38
        if ys.min()<470 or reddish: body[sel]=1     # a runner, or the red/orange reflection of one: both travel together
    stay=((m>0)&(body==0))
    g=lambda a: cv2.GaussianBlur(a.astype(np.float32),(0,0),1.2)
    return g(body),g(stay),(int(np.where(body.any(0))[0].max()) if body.any() else 0)
TE=2.0
_,_,maxx=comps(F1); X0=-float(maxx+60); print('X0',X0,'right edge of runners at frame 1:',maxx)
frames=[]; LAST=119; TEND=(LAST-1)/24.0
for i in range(1,LAST+1):
    t=(i-1)/24.0
    u=min(1.0,t/TE); sx=X0*(1-u)**2
    F=load(i).astype(np.float32); Mb,Ms_,_=comps(F)
    T=np.float32([[1,0,sx],[0,1,0]])
    Mbs=cv2.warpAffine(Mb,T,(1280,720),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=0)[...,None]
    Fs=cv2.warpAffine(F,T,(1280,720),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    w=max(0.0,min(1.0,t/0.45,(TEND-t)/0.35))             # static glints fade in/out so the loop seam is clean
    Mst=Ms_[...,None]*(1-Mbs)*w
    out=P*(1-Mbs-Mst)+Fs*Mbs+F*Mst
    frames.append(out.clip(0,255).astype(np.uint8))
frames.append(P.clip(0,255).astype(np.uint8))
n=len(frames); print('frames',n,'seconds',n/24)
d0=np.abs(frames[0].astype(int)-P.astype(int)).max(2); print('first frame vs plate: px differing >12:',int((d0>12).sum()))
p=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','24','-i','-','-an','-c:v','libx264','-crf','20','-preset','slow','-pix_fmt','yuv420p','-movflags','+faststart','-g','24','/tmp/lx2-hero-enter.mp4'],stdin=subprocess.PIPE)
for f in frames: p.stdin.write(f.tobytes())
p.stdin.close(); p.wait()
sel=[0,3,6,9,12,16,22,30,40,56,84,96,104,110,114,n-1]
tiles=[cv2.resize(frames[k],(480,270)) for k in sel]
rows=[np.hstack(tiles[r*4:(r+1)*4]) for r in range(4)]
cv2.imwrite('timeline.jpg',cv2.cvtColor(np.vstack(rows),cv2.COLOR_RGB2BGR),[cv2.IMWRITE_JPEG_QUALITY,84])
print('t(s):',[round(k/24,2) for k in sel])
# full-res crops of the entrance for close inspection
cv2.imwrite('crop_a.jpg',cv2.cvtColor(np.hstack([frames[6][100:700,0:640],frames[12][100:700,0:640]]),cv2.COLOR_RGB2BGR),[cv2.IMWRITE_JPEG_QUALITY,88])
