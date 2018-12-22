# import key_transformator
import random
import string

key_length = 4

def add_padding(img):
    # 3. key_length equals 4, len(img) could be anything.
    # but len(img)%key_length could range to [0,1,2,3]
    # therefore, l could equal to one of the above, [0,1,2,3].
    l = key_length - len(img)%key_length
    # 4. Append to img one of the following:
    # l = 0 => ''
    # l = 1 => '\x01'
    # l = 2 => '\x02\x02'
    # l = 3 => '\x03\x03\x03'
    # NOTE: Not entirely sure how these would look as a binary string.
    img += chr(l)*l

    # 5. Return the appended image
    return img

def generate_initial_key():
    # 6. string.ascii_uppercase = ABCDEFGHIJKLMNOPQRSTUVWXYZ
    # random.choice simply chooses 1 char from the string above
    # eventually, select 4 random characters from the string above. Character could be repetetive
    return ''.join(random.choice(string.ascii_uppercase) for _ in range(4))

def xor(s1, s2):
    # 9. res should equal to = ['\x00', '\x00', '\x00', '\x00']
    res = [chr(0)]*key_length

    # 10. but range(len(res)) should equal to = [0, 1, 2, 3]
    for i in range(len(res)):
        # 11. ord returns the dec value of ascii char
        q = ord(s1[i])
        d = ord(s2[i])

        # 12. Perform a bitwise xor between every pair of chars from the given parameters
        k = q ^ d

        # 13. Push the char repres of the xor'd value
        res[i] = chr(k)
    
    # 14. Join the array to a string and return it
    res = ''.join(res)
    return res

def original_encryption():
  # 1. Open the flag.png file for read in binary format
  with open('flag.png', 'rb') as f:
      img = f.read()

  # 2. Add padding to the end of the image
  img = add_padding(img)
  # 3. Generate a key
  key = generate_initial_key()

  enc_data = ''

  # 7. Loop starting from 0 up to the length of the binary format of the picture. Jump by 4 each iteration
  for i in range(0, len(img), key_length):
      # 8. img[i:i+key_length] on the first iteration should equal to img[0:4] --> img[0,1,2,3] and so on
      # so in every iteration, a part of the image's binary string is sliced.
      enc = xor(img[i:i+key_length], key)

      # 15. Use the missing lib to perform some sort of operation on the current key
      # key = key_transformator.transform(key)

      # 16. Append the current encrypted string to the new image string
      enc_data += enc

  # 17. Create the new encrypted image
  with open('encrypted.png', 'wb') as f:
      f.write(enc_data)

# Our own transform key func
def transform_key(key):
    new_key = []
    for x in range(0, 4):
        new_key.append(chr((ord(key[x]) + 1) % 256))
    return ''.join(new_key)
    
def decrypt():
    with open('encrypted.png', 'rb') as f:
      img = f.read()
    print 'The encrypted image length(size) is: {0}'.format(len(img))
    print 'This means that the original image size can be between {0} and {1}'.format(len(img) - 3, len(img))
    print '------------------------------------------------------------------------------------------------'
    print 'Attempt to find the original encryption key, based on the fact that if a^b=c then a^c=b or b^c=a'
    print 'Because originally, enc = xor(img[0:4], key) then --> key = xor(img[0:4], enc)'
    print 'But we dont have the key nor img[0:4], so we will brute force our way until we have a match.'
    print 'Generate keys using the original function until we find one.'
    print '------------------------------------------------------------------------------------------------'
    print 'We will also use the fact that .png images ALWAYS start with the same 8 bytes (signature)'
    print '------------------------------------------------------------------------------------------------'
    enc = img[0:4]
    print 'First 4 bytes of the encoded image: {0}'.format(list(enc))    
    original_4_bytes = [chr(137), chr(80), chr(78), chr(71)]
    print 'First 4 bytes of png signature: {0}'.format(original_4_bytes)    
    key = xor(enc, original_4_bytes)
    print 'So the original key is: {0}'.format(key)    
    print '------------------------------------------------------------------------------------------------'
    print 'At the end of the first iteration the key goes through the transformation function which we are not familiar with'
    print 'Attempt to compare the original key and the (first) transformed key...'
    print '------------------------------------------------------------------------------------------------'    
    enc_second = img[4:8]
    print 'Second 4 bytes of the encoded image: {0}'.format(list(enc_second))    
    original_second_4_bytes = [chr(13), chr(10), chr(26), chr(10)]
    print 'Second 4 bytes of png signature: {0}'.format(original_second_4_bytes)    
    first_trans_key = xor(enc_second, original_second_4_bytes)
    print 'So the transformed key is: {0}'.format(first_trans_key) 
    print '------------------------------------------------------------------------------------------------'    
    print 'Watch the 2 keys: {0} --- {1}'.format(key, first_trans_key)
    print 'If we add 1 to each char ascii value of the original key we would get the transf key.'
    print 'For example, first chars: {0}-{1}={2}'.format(key[0], first_trans_key[0], ord(key[0]) - ord(first_trans_key[0]))
    print 'For example, second chars: {0}-{1}={2}'.format(key[1], first_trans_key[1], ord(key[1]) - ord(first_trans_key[1]))
    print 'For example, third chars: {0}-{1}={2}...'.format(key[2], first_trans_key[2], ord(key[2]) - ord(first_trans_key[2]))
    print '------------------------------------------------------------------------------------------------'    

    dec_data = ''
    for i in range(0, len(img), key_length):
        dec = xor(img[i:i+key_length], key)
        key = transform_key(key)
        dec_data += dec
    
    for i in dec_data:
        if ord(i) >= 65 and ord(i) <= 127:
            print (i),

    with open('decrypted.png', 'wb') as f:
      f.write(dec_data)

decrypt()

# with open('encrypted.png', 'rb') as f:
#     img = f.read()

