import sys
from PIL import Image
prefix, n, cols = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ims=[Image.open(f'tools/shots/{prefix}{i}.png').resize((480,270)) for i in range(n)]
rows=(n+cols-1)//cols
W=Image.new('RGB',(480*cols,270*rows))
for i,im in enumerate(ims): W.paste(im,((i%cols)*480,(i//cols)*270))
W.save(f'tools/shots/{prefix}_grid.png')
