from __future__ import print_function
from random import randint, shuffle
import sys
from struct import unpack, pack as pk
from io import BytesIO as BIO
import lzwlib

up = lambda *args: unpack(*args)[0]

# Reads & Validates header
def F(f):
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


class T(object):
    I = 0 # image sep
    EG = 1 # graphic control label
    EA = 2 # application extension 
    EC = 3 # comment label
    ET = 4

# Reads all kinds of block from gif
def C(f):
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
            nbuf += V(f)

            # TODO: T.I equals 0. not sure what this actually means
            t = T.I

        # If extension introducer
        elif b == 0x21:
            # read introducer
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
                t = T.EG
            # Application extension OR Plain text label
            elif b in [0xFF, 0x01]:
                nbuf = f.read(1)
                blksize = up('B', nbuf)
                nbuf += f.read(blksize)
                nbuf += V(f)

                t = (b+3) & 0x0F
            # Comment label
            elif b == 0xFE:
                nbuf = V(f)

                t = T.EC
            else:
                raise Exception("unsupprted thing @{}".format(f.tell()))

        buf += nbuf

        yield t, buf
        rb = f.read(1)
        b = up('B', rb)

    yield None, '\x3B'

    raise StopIteration


# maps 
def WB(buf):
    # amount of blocks. each block size should be FF = 255
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


def k(bf):
    combined_buf = ''
    while True:
        # read first byte which is supposed to be the size ?
        cb = ord(bf.read(1))
        if not cb:
            break

        combined_buf += bf.read(cb)
    return combined_buf


# reads a single block
def V(f):
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

# receives delay, width, height, x y and tidx
# tidx should be bt 0 and 255 (1 byte)
# delay is bt 0 & 65536 (2 bytes)
# creates a graphic control extension block
def Q(delay, w, h, x, y, tidx):

    assert 0 <= tidx <= 255
    assert 0 <= delay < 2**16

    # this is used for the compression
    # multiplies tidx by (w*h) times
    # so eventually the size of list is w*h and each cell is tidx
    indices = [tidx]*(w*h)
    buf = BIO('')
    
    # 0x21 0xf9  = intro & label
    # 0x04 = block size
    # 0x05 = 0000 0101 
    # bit 0 is reserved (???)
    # bit 2 is is also reserved (?????)
    buf.write('\x21\xF9\x04\x05')

    # write delay as unsigned short 2 bytes
    buf.write(pk('H', delay))
    # write index as unsigned char 1 byte
    buf.write(pk('B', tidx))
    # terminate block
    buf.write('\x00')

    # new image block 
    buf.write('\x2c')
    # left pos
    buf.write(pk('H', x))
    # top pos
    buf.write(pk('H', y))
    # width & height
    buf.write(pk('H', w))
    buf.write(pk('H', h))
    # flag  section & local color table = 0
    buf.write('\x00')

    # min code size equals 8
    LZWMinimumCodeSize = 8

    # compression
    cmprs, _ = lzwlib.Lzwg.compress(
        indices, LZWMinimumCodeSize)

    # write min code size and the compressed blocks
    obuf = pk('B', LZWMinimumCodeSize) + WB(cmprs)

    # write obuf to buf
    buf.write(obuf)
    buf.seek(0)
    
    # read entire buffer
    return buf.read()

# generates a list of size sqrt(n)+1
# each cell 
def z(n):
    import math
    for i in xrange(1, int(math.sqrt(n) + 1)):
        if n % i == 0:
            yield i

# a = index of char in new flag
# mm = width
# hh = height
def m(a, mm, hh):
    # if leftp == 0 && topp == 1 then a<8 && a is odd & origin index is height / 4
    # if leftp == 1 && top is even && top != 0 then index is topp / 2
    # TODO: else TBD
    # if index of char in new flag is lower than 8
    if a < 0x08:
        # if index is odd
        if a % 2:
            _0 = 0 # leftp
            _1 = 1 # topp
            _3 = randint(4, mm-1) # width bt 4 & original width-1
            _4 = a << 2 # height = index * 4
        else: # index is even
            _0 = 1 # leftp
            _1 = a << 1 # topp = index * 2
            _3 = randint(4, mm/2) # width bt 4 &  (original width / 2)
            _4 = randint(4, hh/3) # height bt 4 & (original height/3)
    else: # else if index bigger equals to 8
        ds = list(z(a))
        shuffle(ds)
        _0 = 0 # leftp
        _1 = 0 # 
        _4 = ds[0]
        assert a % _4 == 0
        _3 = a/_4

    # returns 4 bits
    return _0, _1, _3, _4

# b6 = mpindx = index of char in new flag (if origin was ABC and then BAC -> cell value is (1,1))
# b1 = isup = is upper
# mw, mh = height & width
# mci = global colors - 1
# d = 3 ??
# this function returns a graphic extension block
def h(b6, b1, mw, mh, mci, d=3):
    # generates a number between (0 and (mci-1)/2) * 2. adds 1 if uppercase letter
    # randint()*2 is always even
    # so if b1 is 1 (uppercase) 
    # then idx should be odd
    # which means that if tidx is even then letter is lowercase, otherwise upper
    idx = randint(0, (mci-1)/2)*2 + b1
    
    # m receives mpindex, width, height
    # returns 4 bits
    x, xx, xxx, xxxx = m(b6, mw, mh)

    # d is delay which defaults to 3
    # xxx represents w
    # xxxx represents h
    # x is left pos
    # xx is top pos
    f = Q(d, xxx, xxxx, x, xx, idx)

    # finally, returns the new blocks
    return f

# parses the flag and shuffles....
def M(s):
    # convert flags string to a distinct list
    l = list(set(s.upper()))
    # randomize list order
    shuffle(l)
    # create a string from shuffled list
    d = ''.join(l)
    # length of flag should be smaller than 2^6 = 64 
    assert len(d) <= 2**6, ''
    # TODO: this is some sort of array which returns the index of origin char in the "encoded" string, and is upper cased to begin with (represented as 0 and 1)
    return d, [(d.index(c.upper()), int(c.isupper())) for c in s]

# f = input file
# s = flag
# o = output file
def E(f, s, o):
    # Headers of file
    global_colors, bgcoloridx, size_count, hh, ww = F(f)

    # (mutated) Flag (??)
    mp, ks = M(s)

    # By here, current file cursor should be at the end of the header
    hdr_end = f.tell()

    # Go back to file beginning
    f.seek(0)
    # Write header string to output
    o.write(f.read(hdr_end))

    fc = 0

    # write these 2 bytes.
    # 0x21 is extension into
    # 0xfe is COMMENT LABEL
    o.write('\x21\xFE')

    # writes the mapped flags with RDBNB prepended after mutating iwth WB
    o.write(WB('RDBNB'+mp))
    o.flush()

    # iterate on the generator C returns
    for t, buf in C(f):
        print('.', end='')
        # if comment
        # IGNORES COMMENT SECTION TO OUTPUT.
        if t == T.EC:
            continue
        
        # if graphic control label
        if t == T.EG:
            # if havent finished encoding the flag into file, mutate in the following way:
            if ks:
                # reads 2 bytes from buffer ([4,5]) and parses as H - unsigned short
                delay = up('<H', buf[4:6])
                # all delays of gif were over 6
                assert delay >= 6
                # changes the delay. decrease by 3
                buf = buf[:4] + pk('<H', delay - 3) + buf[6:]
            obuf = buf

        # else if image sep
        elif t == T.I:
            fc += 1
            total_raw_blocks_data = ''
            bf = BIO(buf)
            pref = bf.read(10)

            # reads the code size but parses it as char 
            LZWMinimumCodeSize = ord(bf.read(1))
            # read block data
            total_raw_blocks_data = k(bf)

            indices, dcmprsdcodes = lzwlib.Lzwg.decompress(
                total_raw_blocks_data, LZWMinimumCodeSize)
            
            # < = little endian
            # B = unsigned char
            # H = unsigned short
            xxx = unpack('<B H H H H B', pref)

            cmprs, codes = lzwlib.Lzwg.compress(
                indices, LZWMinimumCodeSize)

            obuf = pref + pk('B', LZWMinimumCodeSize) + WB(cmprs)

            # pop ks here - only on image section
            if ks:
                mpindx, isup = ks.pop(0)
                obuf += h(mpindx, isup, ww, hh, len(global_colors)-1)
        else:
            obuf = buf

        # write to output
        o.write(obuf)
    o.flush()

    # eventually, ks should be false
    assert not ks, ''

    return 0


if __name__ == '__main__':
    d = list(z(35))
    sd = shuffle(d)
    
    # assert len(sys.argv) > 2, 'bad input'
    fpath = '/Users/dorweidman/Documents/CP_Challenges/bowser/secret.gif'  #sys.argv[1]


    # secret.gif was encoded using the flag:  OE7AUKL}_GY#0FR{!HMTWS ---> FLAG{YOURE_} , khmtws 7#0!
    flag = 'OE7AUKL}_GY#0FR{!HMTWS' # sys.argv[2]

    if len(sys.argv) > 3:
        outpath = sys.argv[3]
    else:
        outpath = fpath + '.out.gif'

    f = open(fpath, 'rb')
    o = open(outpath, 'wb')
    rv = E(f, flag, o)
    sys.exit(rv)
