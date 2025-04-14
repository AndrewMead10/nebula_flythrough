from PIL import Image as img
from os import listdir
from os.path import isfile, join
import numpy as np
import tensorflow as tf
import tensorflow.keras as K
import tensorflow.keras.layers as L
import copy
import tifffile as tiff
import os

class SubtractLayer(L.Layer):
    def call(self, inputs):
        return inputs[0] - inputs[1]

class StarNet():
    def __init__(self, mode:str, window_size:int = 512, stride:int = 256):
        assert mode in ['RGB', 'Greyscale'], "Mode should be either RGB or Greyscale"
        self.mode = mode
        if self.mode == 'RGB': 
            self.input_channels = 3
        else: 
            self.input_channels = 1
        self.window_size = window_size
        self.stride = stride
        
    def __str__(self):
        return "StarNet instance"
        
    def load_model(self, weights:str):
        """Load the generator model weights."""
        self.G = self._generator(self.mode)
        
        try:
            self.G.load_weights(weights + '_G_' + self.mode + '.h5')
            print('Generator weights loaded successfully')
        except:
            raise ValueError('Could not load generator weights')
            
    def transform(self, in_name, out_name):
        """Transform an image by removing stars and generate a mask of removed stars."""
        # Use PIL to read the image, which supports multiple formats
        try:
            pil_image = img.open(in_name)
            data = np.array(pil_image)
        except Exception as e:
            print(f"Error reading image with PIL: {e}")
            # Fall back to tiff.imread for TIFF files
            try:
                data = tiff.imread(in_name)
            except Exception as e:
                print(f"Error reading image with tiff: {e}")
                raise ValueError(f"Could not read image {in_name}. Please ensure it's a valid image file.")
            
        if len(data.shape) > 3:
            layer = input("Image has %d layers, please enter layer to process: "%data.shape[0])
            layer = int(layer)
            data=data[layer]
            
        input_dtype = data.dtype
        if input_dtype == 'uint16':
            image = (data / 255.0 / 255.0).astype('float32')
        elif input_dtype == 'uint8':
            image = (data / 255.0).astype('float32')
        else:
            raise ValueError('Unknown image dtype:', data.dtype)
            
        if self.mode == 'Greyscale' and len(image.shape) == 3:
            raise ValueError('You loaded Greyscale model, but the image is RGB!')
            
        if self.mode == 'Greyscale':
            image = image[:, :, None]
        
        if self.mode == 'RGB' and len(image.shape) == 2:
            raise ValueError('You loaded RGB model, but the image is Greyscale!')
        
        if self.mode == 'RGB' and image.shape[2] == 4:
            print("Input image has 4 channels. Removing Alpha-Channel")
            image=image[:,:,[0,1,2]]
        
        offset = int((self.window_size - self.stride) / 2)
        
        h, w, _ = image.shape
        
        ith = int(h / self.stride) + 1
        itw = int(w / self.stride) + 1
        
        dh = ith * self.stride - h
        dw = itw * self.stride - w
        
        image = np.concatenate((image, image[(h - dh) :, :, :]), axis = 0)
        image = np.concatenate((image, image[:, (w - dw) :, :]), axis = 1)
        
        h, w, _ = image.shape
        image = np.concatenate((image, image[(h - offset) :, :, :]), axis = 0)
        image = np.concatenate((image[: offset, :, :], image), axis = 0)
        image = np.concatenate((image, image[:, (w - offset) :, :]), axis = 1)
        image = np.concatenate((image[:, : offset, :], image), axis = 1)
        
        image = image * 2 - 1
        
        output = copy.deepcopy(image)
        
        for i in range(ith):
            for j in range(itw):
                x = self.stride * i
                y = self.stride * j
                
                tile = np.expand_dims(image[x:x+self.window_size, y:y+self.window_size, :], axis = 0)
                tile = (self.G(tile)[0] + 1) / 2
                tile = tile[offset:offset+self.stride, offset:offset+self.stride, :]
                output[x+offset:self.stride*(i+1)+offset, y+offset:self.stride*(j+1)+offset, :] = tile
        
        output = np.clip(output, 0, 1)
        
        if self.mode == 'Greyscale':
            output = output[offset:-(offset+dh), offset:-(offset+dw), 0]
        else:
            output = output[offset:-(offset+dh), offset:-(offset+dw), :]
            
        # Create a mask of the stars by comparing the original and starless images
        # First, get the original image without padding and rescale back from [-1,1] to [0,1]
        original = (image[offset:-(offset+dh), offset:-(offset+dw), :] + 1) / 2
        
        # Calculate the luminance of both images (0.299R + 0.587G + 0.114B)
        original_lum = 0.299 * original[:,:,0] + 0.587 * original[:,:,1] + 0.114 * original[:,:,2]
        output_lum = 0.299 * output[:,:,0] + 0.587 * output[:,:,1] + 0.114 * output[:,:,2]
        
        # Calculate the difference in luminance
        mask = np.abs(original_lum - output_lum)
        
        # Normalize the difference to [0,1]
        mask = (mask - mask.min()) / (mask.max() - mask.min() + 1e-8)
        
        # Save the starless image
        if input_dtype == 'uint8':
            tiff.imwrite(out_name, (output * 255).astype('uint8'))
        else:
            tiff.imwrite(out_name, (output * 255 * 255).astype('uint16'))
            
        # Save the star mask
        base_name, ext = os.path.splitext(out_name)
        mask_filename = f"{base_name}_mask{ext}"
        tiff.imwrite(mask_filename, (mask * 255).astype('uint8'))
        
        print(f"Saved starless image to: {out_name}")
        print(f"Saved star mask to: {mask_filename}")
        
    def _generator(self, m):
        layers = []
    
        filters = [64, 128, 256, 512, 512, 512, 512, 512, 512, 512, 512, 512, 256, 128, 64]
        
        input = L.Input(shape=(self.window_size, self.window_size, self.input_channels), name = "gen_input_image")
        
        # layer 0
        convolved = L.Conv2D(filters[0], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(input)
        layers.append(convolved)
            
        # layer 1
        rectified = L.LeakyReLU(alpha = 0.2)(layers[-1])
        convolved = L.Conv2D(filters[1], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(convolved, training = True)
        layers.append(normalized)
            
        # layer 2
        rectified = L.LeakyReLU(alpha = 0.2)(layers[-1])
        convolved = L.Conv2D(filters[2], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(convolved, training = True)
        layers.append(normalized)
            
        # layer 3
        rectified = L.LeakyReLU(alpha = 0.2)(layers[-1])
        convolved = L.Conv2D(filters[3], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(convolved, training = True)
        layers.append(normalized)
            
        # layer 4
        rectified = L.LeakyReLU(alpha = 0.2)(layers[-1])
        convolved = L.Conv2D(filters[4], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(convolved, training = True)
        layers.append(normalized)
            
        # layer 5
        rectified = L.LeakyReLU(alpha = 0.2)(layers[-1])
        convolved = L.Conv2D(filters[5], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(convolved, training = True)
        layers.append(normalized)
        
        # layer 6
        rectified = L.LeakyReLU(alpha = 0.2)(layers[-1])
        convolved = L.Conv2D(filters[6], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(convolved, training = True)
        layers.append(normalized)
        
        # layer 7
        rectified = L.LeakyReLU(alpha = 0.2)(layers[-1])
        convolved = L.Conv2D(filters[7], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(convolved, training = True)
        layers.append(normalized)
        
        # layer 8
        rectified = L.ReLU()(layers[-1])
        deconvolved = L.Conv2DTranspose(filters[8], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(deconvolved, training = True)
        layers.append(normalized)
            
        # layer 9
        concatenated = L.Concatenate(axis=3)([layers[-1], layers[6]])
        rectified = L.ReLU()(concatenated)
        deconvolved = L.Conv2DTranspose(filters[9], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(deconvolved, training = True)
        layers.append(normalized)
        
        # layer 10
        concatenated = L.Concatenate(axis=3)([layers[-1], layers[5]])
        rectified = L.ReLU()(concatenated)
        deconvolved = L.Conv2DTranspose(filters[10], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(deconvolved, training = True)
        layers.append(normalized)
            
        # layer 11
        concatenated = L.Concatenate(axis=3)([layers[-1], layers[4]])
        rectified = L.ReLU()(concatenated)
        deconvolved = L.Conv2DTranspose(filters[11], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(deconvolved, training = True)
        layers.append(normalized)
            
        # layer 12
        concatenated = L.Concatenate(axis=3)([layers[-1], layers[3]])
        rectified = L.ReLU()(concatenated)
        deconvolved = L.Conv2DTranspose(filters[12], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(deconvolved, training = True)
        layers.append(normalized)
            
        # layer 13
        concatenated = L.Concatenate(axis=3)([layers[-1], layers[2]])
        rectified = L.ReLU()(concatenated)
        deconvolved = L.Conv2DTranspose(filters[13], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(deconvolved, training = True)
        layers.append(normalized)
            
        # layer 14
        concatenated = L.Concatenate(axis=3)([layers[-1], layers[1]])
        rectified = L.ReLU()(concatenated)
        deconvolved = L.Conv2DTranspose(filters[14], kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(deconvolved, training = True)
        layers.append(normalized)
            
        # layer 15
        concatenated = L.Concatenate(axis=3)([layers[-1], layers[0]])
        rectified = L.ReLU()(concatenated)
        deconvolved = L.Conv2DTranspose(self.input_channels, kernel_size = 4, strides = (2, 2), padding = "same", kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        rectified = L.ReLU()(deconvolved)
        output = SubtractLayer()([input, rectified])
        
        return K.Model(inputs = input, outputs = output, name = "generator")