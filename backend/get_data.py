import numpy as np
from astropy.io import fits

def get_stars_with_parsecs():
    # Read the axy.fits file
    axy_data = fits.getdata('backend/data/axy.fits')
    
    # Read the corr.fits file
    corr_data = fits.getdata('backend/data/corr.fits')
    
    # Create output array with x, y, distance_mpc
    stars = np.zeros((len(axy_data), 3))
    
    # Fill in the data
    stars[:, 0] = axy_data['X']  # x coordinates
    stars[:, 1] = axy_data['Y']  # y coordinates
    
    # Match stars between files and get parallax
    for i in range(len(axy_data)):
        # Find matching star in corr file using field_x and field_y
        x_match = np.where(np.isclose(corr_data['field_x'], axy_data['X'][i], rtol=1e-5))[0]
        y_match = np.where(np.isclose(corr_data['field_y'], axy_data['Y'][i], rtol=1e-5))[0]
        match_idx = np.intersect1d(x_match, y_match)
        
        if len(match_idx) > 0:
            parallax = corr_data['parallax'][match_idx[0]]
            
            # Convert parallax to distance in pc
            if parallax > 0:  # Only convert if parallax is positive
                distance_pc = 1.0 / parallax  # Distance in parsecs
                stars[i, 2] = distance_pc 
            else:
                continue
        else:
            continue
    
    return stars

# Test the function
if __name__ == "__main__":
    stars = get_stars_with_parallax()
    print("First 5 stars (x, y, distance [Mpc]):")
    print(stars[:5])
    print("\nNumber of stars:", len(stars))
    print("Number of stars with valid distance:", np.sum(~np.isnan(stars[:, 2])))
