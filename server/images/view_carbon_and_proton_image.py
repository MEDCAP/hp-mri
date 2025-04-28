from matplotlib import pyplot as plt
from scipy.io import loadmat
import os
import numpy as np
# Make a directory at "./test_image_matfiles" and put the mat files there

# Load the proton image
assert os.path.exists("test_image_matfiles"), "Directory does not exist"
proton_matfile = "test_image_matfiles/1115_first_measurement_dcm.mat"
proton_image = loadmat(proton_matfile)['data']

# Load the carbon image
carbon_matfile = "test_image_matfiles/meas_MID01696_FID08543_c13_spspsp_BPAL_inj2_reconimage.mat"
carbon_image = loadmat(carbon_matfile)['data']
# carbon_image = np.linalg.norm(abs(carbon_image), axis=0)    # Average over the 8coils
carbon_image = carbon_image[1, :, :, 3, 1]    # show the 15th slice, and the 1st metabolite=Pyruvate
print(carbon_image.shape)

fig, ax = plt.subplots(1, 2)
ax[0].imshow(proton_image, cmap="gray")
ax[0].set_title("Proton Image of liver slice")
ax[1].imshow(carbon_image, cmap="gray")
ax[1].set_title("Carbon Image of heart slice")
plt.show()