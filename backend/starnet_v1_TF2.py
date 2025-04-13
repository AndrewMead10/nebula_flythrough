from PIL import Image as img
from os import listdir
from os.path import isfile, join
import numpy as np
import tensorflow as tf
import tensorflow.keras as K
import tensorflow.keras.layers as L
import copy
import tifffile as tiff

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
        diff = np.abs(original_lum - output_lum)
        
        # Normalize the difference to [0,1]
        diff = (diff - diff.min()) / (diff.max() - diff.min() + 1e-8)
        
        # Apply adaptive thresholding
        # First get the mean and standard deviation of differences
        mean_diff = np.mean(diff)
        std_diff = np.std(diff)
        
        # Use a higher threshold based on both mean and standard deviation
        threshold = mean_diff * 6.0 + std_diff * 2.0
        
        # Create initial mask
        mask = (diff > threshold).astype(np.float32)
        
        # Remove small noise using morphological operations
        from scipy import ndimage
        
        # First remove very small noise
        mask = ndimage.binary_opening(mask, structure=np.ones((3,3)))
        
        # Then remove slightly larger artifacts
        mask = ndimage.binary_opening(mask, structure=np.ones((5,5)))
        
        # Fill small holes in stars
        mask = ndimage.binary_closing(mask, structure=np.ones((3,3)))
        
        # Remove isolated pixels again after closing
        mask = ndimage.binary_opening(mask, structure=np.ones((2,2)))
        
        # Optional: Label connected components and remove very small ones
        labels, num_features = ndimage.label(mask)
        if num_features > 0:
            # Remove components smaller than 5 pixels
            for i in range(1, num_features + 1):
                component = (labels == i)
                if np.sum(component) < 5:
                    mask[component] = 0
        
        # Save the starless image
        if input_dtype == 'uint8':
            tiff.imsave(out_name, (output * 255).astype('uint8'))
        else:
            tiff.imsave(out_name, (output * 255 * 255).astype('uint16'))
            
        # Save the star mask
        mask_filename = out_name.replace('.tif', '_mask.tif')
        tiff.imsave(mask_filename, (mask * 255).astype('uint8'))
        
        print(f"Saved starless image to: {out_name}")
        print(f"Saved star mask to: {mask_filename}")
        
    def _generator(self, m):
        """U-Net architecture for the generator."""
        filters = [64, 128, 256, 512, 512, 512, 512, 512, 512, 512, 512, 512, 256, 128, 64]
        
        input = L.Input(shape=(self.window_size, self.window_size, self.input_channels), name = "gen_input_image")
        
        # Encoder path
        layers = []
        
        # layer 0 (first encoding layer)
        convolved = L.Conv2D(filters[0], kernel_size = 4, strides = (2, 2), padding = "same", 
                           kernel_initializer = tf.initializers.GlorotUniform())(input)
        layers.append(convolved)
            
        # encoding layers 1-7
        for i in range(7):
            rectified = L.LeakyReLU(alpha = 0.2)(layers[-1])
            convolved = L.Conv2D(filters[i+1], kernel_size = 4, strides = (2, 2), padding = "same", 
                               kernel_initializer = tf.initializers.GlorotUniform())(rectified)
            normalized = L.BatchNormalization()(convolved, training = True)
            layers.append(normalized)
            
        # Decoder path
        # layer 8 (first decoding layer)
        rectified = L.ReLU()(layers[-1])
        deconvolved = L.Conv2DTranspose(filters[8], kernel_size = 4, strides = (2, 2), padding = "same", 
                                      kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        normalized = L.BatchNormalization()(deconvolved, training = True)
        layers.append(normalized)
            
        # decoding layers 9-15 with skip connections
        for i in range(7):
            concatenated = L.Concatenate(axis=3)([layers[-1], layers[6-i]])
            rectified = L.ReLU()(concatenated)
            deconvolved = L.Conv2DTranspose(filters[9+i], kernel_size = 4, strides = (2, 2), padding = "same", 
                                          kernel_initializer = tf.initializers.GlorotUniform())(rectified)
            normalized = L.BatchNormalization()(deconvolved, training = True)
            layers.append(normalized)
            
        # Final layer
        concatenated = L.Concatenate(axis=3)([layers[-1], layers[0]])
        rectified = L.ReLU()(concatenated)
        deconvolved = L.Conv2DTranspose(self.input_channels, kernel_size = 4, strides = (2, 2), padding = "same", 
                                      kernel_initializer = tf.initializers.GlorotUniform())(rectified)
        rectified = L.ReLU()(deconvolved)
        output = L.Subtract()([input, rectified])
        
        return K.Model(inputs = input, outputs = output, name = "generator") 