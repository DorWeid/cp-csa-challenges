from random import randint, shuffle
import sys
from struct import unpack, pack as pk
from io import BytesIO as BIO
import lzwlib
import string

up = lambda *args: unpack(*args)[0]

class BlockType(object):
    IMAGE = 0
    GRAPHIC_CONTROL = 1 
    APPLICATION_EXTENSION = 2
    COMMENT = 3 
    TEXT = 4

# Reads & Validates header
def readHeader(f):
    # make sure file is a gif, and gif is of 89a version
    assert f.read(3) == 'GIF', ''
    assert f.read(3) == '89a', ''

    # read width and height
    w, h = unpack('HH', f.read(4))

    # height and width should be between 32x32 -- 500x500
    assert 32 <= w <= 500, ''
    assert 32 <= h <= 500, ''

    # read the flags present in offset 10. each bit represents a flag
    logflags = up('B', f.read(1))

    # bits 4 & 6 should be on (starting from offset 0)
    # bit 4 = Sort Flag to Global Color Table
    # bit 5..7 = Size of Global Color Table: 2^(1+n). 
    # so if 6 is on = 2^(1+64) ?
    assert logflags & 0x80, ''
    size_count = logflags & 0x07

    # color resolution bt 4 & 256
    gct_count = 2**(size_count+1)
    assert 4 <= gct_count <= 256, ''

    # bg color index (offset 11)
    bgcoloridx = up('B', f.read(1))

    # skip pixel aspect ratio
    f.seek(1, 1)

    # colors
    clrs = []
    for i in xrange(gct_count):
        # read 3 bytes each block
        clr = (up('B', f.read(1)), up('B', f.read(1)), up('B', f.read(1)))
        clrs.append(clr)

    # there should be more color than bgcoloridx ? why
    assert len(clrs) > bgcoloridx, ''
    return clrs, bgcoloridx, size_count, h, w

# Writes block section + adds 0x00
# returns as a string ready to be written 
def writeBlock(buf):
    # amount of blocks. max size is a single byte
    blockcount = len(buf)/0xFF
    # if amount of blocks is not divisble by 255, add 1, else nothing
    blockcount += 1 if len(buf) % 0xFF else 0

    # pack/parse length of each subblock as unsigned integer
    # each sub block is the size FF
    # so each "mapped" cell in blocks array should be of the format
    # ${parsedLength}${subBlock}
    blocks = [
        pk('B', len(subblock)) + subblock for subblock in [
            buf[i:0xFF+i] for i in xrange(0, blockcount*0xFF, 0xFF)
        ]
    ]

    # join all blocks to a string and append 00 at the end
    # 0x00 represents end of block
    return ''.join(blocks) + '\x00'

# reads a single block
def readSingleBlock(f):
    sbx = ''

    while True:
        # block size
        rcb = f.read(1)
        sbx += rcb

        # block terminator.. exit
        if rcb == '\x00':
            break

        # read $blockSize bytes image data
        cb = up('B', rcb)
        blk = f.read(cb)

        # append to ret value
        sbx += blk

    return sbx

# Reads all kinds of block from gif
def readBlocks(f):
    rb = f.read(1)
    b = up('B', rb)

    # while not reached the end (0x3b = GIF file terminator)
    while b != 0x3B:
        buf = ''
        buf += rb

        # 0x2c = image seperator
        # so if b is the image sep
        if b == 0x2c:
            # read 8 bytes which are image left pos, image top pos, image widht, image height
            nbuf = f.read(2*4)

            # read flags of image block
            eb = f.read(1)

            # flags should have first and second bits OFF
            # bit 0: Local Color Table Flag (LCTF)
            # bit 1: Interlace Flag
            assert (up('B', eb) & 0x03) == 0, ''

            # append to nbuf
            nbuf += eb

            # because the bits above are off, read the LZW min code size and append
            nbuf += f.read(1)

            # read block
            nbuf += readSingleBlock(f)

            t = BlockType.IMAGE

        # If extension introducer
        elif b == 0x21:
            rb = f.read(1)
            buf += rb
            b = up('B', rb)

            # Graphic control label
            if b == 0xF9:
                nbuf = f.read(1)
                blksize = up('B', nbuf)

                nbuf += f.read(blksize)
                nbuf += f.read(1)
                assert nbuf[-1] == '\x00', ''
                t = BlockType.GRAPHIC_CONTROL
            
            # Application extension OR Plain text label
            elif b in [0xFF, 0x01]:
                nbuf = f.read(1)
                blksize = up('B', nbuf)
                nbuf += f.read(blksize)
                nbuf += readSingleBlock(f)

                # 0xFF = 0x02 
                # 0x01 = 0x04
                t = (b+3) & 0x0F
            
            # Comment label
            elif b == 0xFE:
                nbuf = readSingleBlock(f)
                t = BlockType.COMMENT

            else:
                raise Exception("unsupprted thing @{}".format(f.tell()))

        buf += nbuf

        yield t, buf
        rb = f.read(1)
        b = up('B', rb)

    yield None, '\x3B'

    raise StopIteration

def readImageBlock(bf):
    combined_buf = ''
    while True:
        # Read block size
        # NOTE: this is parsed in a weird way... not sure if something weird here
        cb = ord(bf.read(1))

        if not cb:
            break

        combined_buf += bf.read(cb)
    return combined_buf

def readFirstComment(file): 
    extensionIntro = up('B', file.read(1))
    commentLabel = up('B', file.read(1))
    assert extensionIntro == 0x21, ''
    assert commentLabel == 0xfe, ''
    blocks = readSingleBlock(file)
    return blocks

# a = index of char in new flag
# mm = width
# hh = height
def firstDecFunc(leftPos, topPos, width, height):
  # if leftp == 0 && topp == 1 then a<8 && a is odd & origin index is height / 4
  # if leftp == 1 && top is even && top != 0 then index is topp / 2
  # TODO: else TBD

  if leftPos == 0 and topPos == 1:
    return height / 4
  
  if leftPos == 1 and topPos % 2 == 0:
    return topPos / 2
  
  return width * height

def decrypt(encryptedFile, decodedFile):
    # Headers of file
    global_colors, bgcoloridx, size_count, hh, ww = readHeader(encryptedFile)

    # By here, current file cursor should be at the end of the header
    hdr_end = encryptedFile.tell()

    # Go back to file beginning
    encryptedFile.seek(0)
    # Write header string to output
    decodedFile.write(encryptedFile.read(hdr_end))

    # Reaching here means the header section of decoded file is done
    # Moving on ...

    # The first block should be a comment section which includes the secret flag (mutated)
    # should look like:
    # 0x21 extension introducer
    # 0xfe comment label
    # [{
    #   blockSize, RDBNB+flag
    # }]
    # 0x00

    readFirstComment(encryptedFile)

    encryptedFlag = 'OE7AUKL}_GY#0FR{!HMTWS'
    originalFlag = ''

    print ('Finished reading first block (comment)')
    print 'The flag is: {0}'.format(encryptedFlag)
    print 'Flag size: {0}'.format(len(encryptedFlag))
    print 'Now pointing to the next section...'

    firstPotential = 0
    secondPotential = 0
    encodedFlag = []

    # After this, there should be no comment sections at all, becuase the encoder doesnt write any comments.

    gen = readBlocks(f)
    # Iterate on sections using the generator 
    for t, buf in gen:
      if t == BlockType.GRAPHIC_CONTROL:
        # Get delay
        delay = up('<H', buf[4:6])
        # Flags
        flags = up('<B', buf[3:4])
        # Trans Color Idx
        transColIdx = up('<B', buf[6:7])

        if flags == 5 and delay == 3 and (transColIdx>=0 and transColIdx<=63):
          secondPotential += 1
          encodedFlag.append((BlockType.GRAPHIC_CONTROL, secondPotential, {'delay': delay, 'flags': flags, 'transColIdx': transColIdx}))

        obuf = buf

      elif t == BlockType.IMAGE:
        total_raw_blocks_data = ''
        # re-read buffer
        bf = BIO(buf)

        # skip first 10 bytes to get to lzw size
        pref = bf.read(10)

        # reads the code size but parses it as char 
        LZWMinimumCodeSize = ord(bf.read(1))

        # Read all blocks of image data
        total_raw_blocks_data = readImageBlock(bf)

        # Decompress the data (compressed by lzw)
        indices, dcmprsdcodes = lzwlib.Lzwg.decompress(total_raw_blocks_data, LZWMinimumCodeSize)
        
        # < = little endian
        # B = unsigned char = 1 byte
        # H = unsigned short = 2 bytes
        sep, leftp, topp, width, height, flags = unpack('<B H H H H B', pref)

        if (LZWMinimumCodeSize == 8 and flags == 0):
          firstPotential += 1
          encodedFlag.append((BlockType.IMAGE, firstPotential, {'leftp': leftp, 'topp': topp, 'width': width, 'height': height, 'flags': flags, 'minCodeSize': LZWMinimumCodeSize, 'indices': indices, 'dcmprsdcodes': dcmprsdcodes}))          

        cmprs, codes = lzwlib.Lzwg.compress(indices, LZWMinimumCodeSize)

        obuf = pref + pk('B', LZWMinimumCodeSize) + writeBlock(cmprs)

        # until flag has been encoded, 2 more blocks are added:
        # 1. Graphic Control Extension Block withe the following:
        # 1.1. block size = 4 (constant ?)
        # 1.2. flags = 0000 0101 = 5 = bit 0 & bit 2
        # 1.3. delay = 3
        # 1.4. transp color idx = if even then lowercase, else uppercase
        # 2. Image Block
        # 2.1. left pos, top pos, width, height = nothing useful now
        # 2.2. flags = 0
        # 2.3. Local color table = 0
        # 2.4. lzw min code size = 8
        # 2.5. blocks = array of length (width*height) containing only [tidx (from 1.4)]

      # if not graphic control or image, just write without mutating
      else:
        obuf = buf

      o.write(obuf)
    o.flush()

    i = 0

    while i < len(encodedFlag):
      grphic = encodedFlag[i]
      img = encodedFlag[i+1]
      i += 2

      leftp = img[2]['leftp']
      topp = img[2]['topp']
      width = img[2]['width']
      height = img[2]['height']
      
      letterIdxInEnc = firstDecFunc(leftp, topp, width, height)

      isLower = grphic[2]['transColIdx'] % 2 == 0
      originalFlag += encryptedFlag[letterIdxInEnc] if not isLower else encryptedFlag[letterIdxInEnc].lower()

    print originalFlag    
    return 0

if __name__ == '__main__':
  fpath = '/Users/dorweidman/Documents/CP_Challenges/bowser/secret.gif'

  # secret.gif was encoded using the flag:  OE7AUKL}_GY#0FR{!HMTWS ---> FLAG{YOURE_} , khmtws 7#0!

  outpath = fpath + '.out.gif'

  f = open(fpath, 'rb')
  o = open(outpath, 'wb')

  rv = decrypt(f, o)
  sys.exit(rv)
