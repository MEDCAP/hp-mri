# import app.external.python.mrd as mrd
import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import minimize, Bounds
import sys
from pathlib import Path
import os

# path to mrd python package is 'root/external/python/mrd' 
sys.path.append(os.path.join(Path(__file__).parent.parent.parent, 'external','python'))
import mrd
from lorn import *

fidpad = 4 
lb = 42 # Hz

debugphasing = False
debuglorn = False

def generate_aux_images(imglist):
    for iimg in range(len(imglist)):
        imghead = mrd.ImageHeader(image_type=mrd.ImageType.BITMAP)
        img = mrd.Image(head=imghead, data=np.expand_dims(imglist[iimg], (2, 3, 4)))
        yield(mrd.StreamItem.ImageUint32(img))

def get_clarg(clarg, arg, ty):
    clargarr = clarg.split(' ')
    for iarg in range(len(clargarr) - 1):
        print(iarg, clargarr[iarg])
        if(clargarr[iarg] == arg):
            return(ty(clargarr[iarg + 1]))

def append_auximage(a):
    plt.gcf().canvas.draw()
    width, height = plt.gcf().canvas.get_width_height()
    bmp = np.frombuffer(plt.gcf().canvas.tostring_argb(), dtype=np.uint8).reshape((height, width, 4))
    bmp = bmp.astype(np.uint32)
    encodedbmp = np.zeros((bmp.shape[0], bmp.shape[1]), dtype=np.uint32)
    encodedbmp = bmp[:,:,0]*16777216 + bmp[:,:,1]*65536 + bmp[:,:,2]*256 + bmp[:,:,3]
    a.append(encodedbmp)

def kABfiteval(x):
    # P=peak amplitudes of the source metabolite
    # t=time points of the acquisitions
    # y=peak amplitudes of the metabolite to be fitted
    # x[.01, .03, 1] for initial guess
    yp = np.zeros(len(y), dtype=np.float64)
    yp[0] = x[2]
    # numerically integrate, x[0] is kAB, k[1] is 1/T1, x[2] is the amount of B at the beginning of acquisition
    for j in range(1, len(t)):
        dt = t[j] - t[j-1]
        Pbar = (P[j-1] + P[j]) / 2
        yp[j] = yp[j-1] * np.exp(-x[1] * dt) + x[0] * Pbar * np.exp(-x[1] * dt / 2)
    return(yp)

def kABfit(x):
    # x1 = minimize(kABfit, [.01, .03, 1]).x
    yp = kABfiteval(x)
    # print('x=', x, 'sum((yp-y)^2)=', np.sum((yp - y)**2))
    try:
        np.sum((yp - y)**2)
    except RuntimeWarning:
        print('yp-y', yp - y)
    return(np.sum((yp - y)**2))

# perform spectral reconstruction
def spectral_reconstruct(header: mrd.Header, raw_acquisition_list: list, parameters: dict):
    global P, y, t

    sourcepeak = parameters['sourcepeak']
    metabolitelist = parameters['metabolitelist']
    biggestpeakidx = parameters['biggestpeakidx']
    peakoffsets = np.array(parameters['peakoffsets'])
    peaknames = parameters['peaknames']
    wigglefactor = parameters['wigglefactor']
    auximages = []
    numspectra = len(raw_acquisition_list)
    a = raw_acquisition_list[0]
    sampletime = a.head.sample_time_ns / 1.0E+9
    centerfreq = a.head.acquisition_center_frequency
    sampletime = a.head.sample_time_ns / 1.0E+9
    npts = len(a.data)
    # kspace=(spectra, measurements)
    kspace = np.zeros((numspectra, len(a.data)), dtype = 'complex')
    ia = 0
    for ispect in range(kspace.shape[0]):
        kspace[ispect, :] = raw_acquisition_list[ispect].data[:, 0]
        for ipt in range(kspace.shape[1]):
             tk = ipt * sampletime
             kspace[ispect, ipt] *= np.exp(-tk * lb)
    spectra = np.fft.fftshift(np.fft.fft(kspace, axis = (1)), axes = (1))
    currmax = 0
    for ispect in range(numspectra):
        thismax = np.max(np.abs(spectra[ispect, :]))
        if(thismax > currmax):
            currmax = thismax
            maxispect = ispect
    # estimate noise level by looking at the last image in the series
    noise = np.mean(np.abs(spectra[-1, :]))
    maxspect = spectra[maxispect,:].copy()
    maxpt = np.argmax(np.abs(maxspect))
    BW = 1 / sampletime
    # take points within 25 ppm of highest signal
    lowpt = int(maxpt - 25E-6 / (BW / centerfreq) * npts)
    hipt = int(maxpt + 25E-6 / (BW / centerfreq) * npts)
    newBW = BW * (hipt - lowpt) / npts
    spectra = spectra[:, lowpt:hipt]
    # global spectrum across +-25ppm of highest peak
    globalspect = np.zeros(hipt - lowpt, dtype = 'complex')
    xscale = np.array(range(len(globalspect))) / len(globalspect) * newBW / centerfreq * 1E+6
    for ispect in range(numspectra):
        if(np.max(np.abs(spectra[ispect, :])) > noise * 5):
            globalspect += spectra[ispect, :]
    globalspect /= np.max(np.abs(globalspect))
    # estimate peak widths using the FWHM of the largest peak
    maxpeakidx = np.argmax(np.abs(globalspect))
    leftidx = -1
    rightidx = -1
    for isp in range(len(globalspect)):
        if(np.abs(globalspect[(maxpeakidx - isp) % len(globalspect)]) < 0.5 and leftidx == -1):
             leftidx = maxpeakidx - isp
        if(np.abs(globalspect[(maxpeakidx + isp) % len(globalspect)]) < 0.5 and rightidx == -1):
             rightidx = maxpeakidx + isp
    widthguess = (rightidx - leftidx) * (xscale[1] - xscale[0]) / 4
    lornputspect(xscale, globalspect, widthguess, wigglefactor, debuglorn)
    # fit global spectrum to npeaks lorentzians.
    x0 = np.zeros(((4 * len(peakoffsets)) + 2))
    x1 = np.zeros((len(biggestpeakidx), len(x0)))
    diff = np.zeros((len(biggestpeakidx)))
    for icg in range(len(biggestpeakidx)):
        centers = (xscale[np.argmax(np.abs(globalspect))] - (peakoffsets - \
                peakoffsets[biggestpeakidx[icg]])) % (BW / centerfreq * 1E+6)
        for ip in range(len(peakoffsets)):
             x0[3 * len(peakoffsets) + ip] = np.abs(globalspect[np.argmin(np.abs(xscale - centers[ip]))])
             x0[2 * len(peakoffsets) + ip] = np.angle(globalspect[np.argmin(np.abs(xscale - centers[ip]))])
        lornputpeakparams(centers, np.ones((len(peakoffsets))) * widthguess, x0[(2 * len(peakoffsets)):(3 * len(peakoffsets))], debuglorn)
        print('begin minimize', icg)
        x1[icg, :] = minimize(lornfit, x0).x
        for ip in range(len(peakoffsets)):
             if(x1[icg, 3 * len(peakoffsets) + ip] < 0):
                 x1[icg, 3 * len(peakoffsets) + ip] *= -1
                 x1[icg, 2 * len(peakoffsets) + ip] += np.pi
        diff[icg] = np.sum(np.abs(globalspect - lorneval(x1[icg, :])))
    centers = (xscale[np.argmax(np.abs(globalspect))] - (peakoffsets - \
                peakoffsets[biggestpeakidx[np.argmin(diff)]])) % (BW / centerfreq * 1E+6)
    lornputpeakparams(centers, np.ones((len(peakoffsets))) * widthguess, x0[(2 * len(peakoffsets)):(3 * len(peakoffsets))], debuglorn)
    thex1 = x1[np.argmin(diff)]
    centers, widths, phases, amplitudes, baseline = lornunpackx0(thex1, debuglorn)
    specteval = lorneval(thex1)
    plt.clf()
    plt.plot(xscale, np.real(globalspect), 'r')
    plt.plot(xscale, np.imag(globalspect), 'g')
    plt.plot(xscale, np.real(specteval), 'k')
    plt.plot(xscale, np.imag(specteval), 'k')
    for ip in range(0, len(peakoffsets)):
        plt.plot([centers[ip], centers[ip]], [-1, 1], 'k')
        plt.text(centers[ip], .95-ip*.07, str(centers[ip]))
    append_auximage(auximages)
    # now do voxel fits
    lornputpeakparams(centers, widths, phases, debuglorn)
    peakamplitudes = np.zeros((len(peakoffsets), numspectra))
    measurementtimes_ns = [a.head.acquisition_time_stamp_ns - \
            raw_acquisition_list[0].head.acquisition_time_stamp_ns for a in raw_acquisition_list]
    for ispect in range(numspectra):
        print('voxel fit img', ispect)
        thisspect = spectra[ispect,:]
        scaling = np.max(np.abs(thisspect))
        thisspect /= scaling
        lornputspect(xscale, thisspect, widths, wigglefactor, False)
        x0 = np.zeros((len(peakoffsets) + 2))
        for ip in range(len(peakoffsets)):
            x0[ip] = np.abs(thisspect[np.argmin(np.abs(xscale - centers[ip]))])
        bounds = Bounds(np.concatenate((np.zeros((len(peakoffsets))), [-.1, -.1])), np.concatenate((x0[:len(peakoffsets)] * 1.5, [.1, .1])))
        x1 = minimize(lor1fit, x0, bounds=bounds)
        peakamplitudes[:, ispect] = x1.x[:len(peakoffsets)] * scaling
    auc = np.sum(peakamplitudes, axis=(1))
    auc /= max(auc)
    auc *= 100
    peakamplitudes /= np.max(peakamplitudes)
    # now do model fit
    legend = []
    plt.clf()
    colors=['r', 'b', 'g', 'c', 'k', 'r', 'b']
    auc_data = {}
    for ip in range(len(peakoffsets)):
        P = peakamplitudes[sourcepeak, :]   # peak amp of injected sample
        t = np.array(measurementtimes_ns) * 1.0E-9
        y = peakamplitudes[ip, :]           # peak amp of each metabolite
        auc_data[peaknames[ip]] = auc[ip]
        if(ip in metabolitelist):
            # x[0]=kAB, x[1]=1/T1, x[2]=initial amount of metabolite
            # set bounds to T1 of 0.01-100s
            bounds = [(None, None), (1/100, 1), (None, None)]
            x1 = minimize(kABfit, [.01, .03, 1], bounds=bounds).x
            # sample plot
            plt.plot(np.array(measurementtimes_ns) * 1.0E-9, y, colors[ip]+'.', \
                    label = peaknames[ip]+'/{:.5f}'.format(x1[0])+'/{:.2f}'.format(1/x1[1]) + \
                    '/{:.2f}'.format(auc[ip]))
            # fitted line
            plt.plot(np.array(measurementtimes_ns) * 1.0E-9, kABfiteval(x1), '-'+colors[ip], label='_nolabel_')
        else:
            if(ip == sourcepeak):
                plt.plot(np.array(measurementtimes_ns) * 1.0E-9, y, colors[ip]+'-', label=peaknames[ip] + \
                    '/{:.2f}'.format(auc[ip]))
            else:
                plt.plot(np.array(measurementtimes_ns) * 1.0E-9, y, colors[ip]+'--', label=peaknames[ip] + \
                    '/{:.2f}'.format(auc[ip]))
    plt.legend(title='')
    plt.xlabel('time (s)')
    plt.yticks([])
    append_auximage(auximages)
    return(measurementtimes_ns, spectra, centerfreq + np.uint32(centers * centerfreq / 1.0E+6), \
            peakamplitudes, auximages)

def generate_spectra(h: mrd.Header,
                     measurementtimes_ns: float,
                     peakamplitudes: np.ndarray,
                     params: dict,
                     spectra):
    # turn the metabolite array (metabolite x image number x rows x columns) into streamable images
    nspect = spectra.shape[0]
    ntimepoints = spectra.shape[1]
    measfreq = h.experimental_conditions.h1resonance_frequency_hz
    peakoffsets = np.array(params['peakoffsets'])
    peaknames = params['peaknames']
    for ispect in range(nspect):
        # 'image' that is the measured spectrum at this time point
        imghead = mrd.ImageHeader(image_type=mrd.ImageType.COMPLEX)
        if(ispect == 0):
            imghead.flags = mrd.ImageFlags.FIRST_IN_SET
        elif(ispect == nspect - 1):
            imghead.flags = mrd.ImageFlags.LAST_IN_SET
        imghead.measurement_uid = ispect
        imghead.repetition = ispect
        imghead.acquisition_time_stamp_ns = measurementtimes_ns[ispect]
        imghead.image_index = ispect
        imghead.image_series_index = ispect
        spect = mrd.Image(head=imghead, data=np.expand_dims(np.transpose(spectra[ispect, :]), (0, 1, 2, 3)))
        yield(mrd.StreamItem.ImageComplexDouble(spect))
        # 'image' quantifying the amplitudes for this time point
        imghead = mrd.ImageHeader(image_type=mrd.ImageType.MAGNITUDE)
        if(ispect == 0):
            imghead.flags = mrd.ImageFlags.FIRST_IN_SET
        elif(ispect == ntimepoints - 1):
            imghead.flags = mrd.ImageFlags.LAST_IN_SET
        imghead.measurement_uid = ispect
        imghead.measurement_freq = measfreq + np.uint32(measfreq * peakoffsets / 1E+6 + 0.5)
        imghead.measurement_freq_label = np.array(peaknames, dtype=np.dtype(np.object_))
        imghead.repetition = ispect
        imghead.acquisition_time_stamp_ns = measurementtimes_ns[ispect]
        imghead.image_index = ispect
        imghead.image_series_index = ispect
        spect = mrd.Image(head=imghead, data=np.expand_dims(np.transpose(peakamplitudes[:, ispect]), (0, 1, 2, 3)))
        yield(mrd.StreamItem.ImageDouble(spect))


def generate_stream(input: list):
    for item in input:
        if isinstance(item, mrd.Pulse):
            yield mrd.StreamItem.Pulse(item)
        if isinstance(item, mrd.Gradient):
            yield mrd.StreamItem.Gradient(item)
        if isinstance(item, mrd.Acquisition):
            yield mrd.StreamItem.Acquisition(item)

# uploaded mrd file is stored locally in temp filepath
def write_spectral_mrd(filepath: str, params: dict):
    with mrd.BinaryMrdReader(filepath) as r:
        # read header
        header = r.read_header()
        # read acquisition data
        raw_streamables_list = list(r.read_data())
        raw_pulse_list = [x.value for x in raw_streamables_list if type(x.value) == mrd.Pulse]
        raw_pulse_list.sort(key = lambda x: x.head.pulse_time_stamp_ns)
        raw_gradient_list = [x.value for x in raw_streamables_list if type(x.value) == mrd.Gradient]
        raw_gradient_list.sort(key = lambda x: x.head.gradient_time_stamp_ns)
        raw_acquisition_list = [x.value for x in raw_streamables_list if type(x.value) == mrd.Acquisition]
        raw_acquisition_list.sort(key = lambda x: x.head.acquisition_time_stamp_ns)
    # rename the filename of the filepath
    output_filepath = filepath.split('.')[0] + '_spectral.mrd'
    with mrd.BinaryMrdWriter(output_filepath) as w:
        # rewrite header
        w.write_header(header)
        # check if sequence name is 1pul
        if header.measurement_information.sequence_name.find('1pul') < 0:
            raise Exception('Spectral reconstruction is not supported for 1pul sequence')
        # perform spectral reconstruction
        [measurementtimes_ns, spectra, peakfrequencies, peakamplitudes, auximages] = spectral_reconstruct(
                header=header,
                raw_acquisition_list=raw_acquisition_list,
                parameters=params)
        w.write_data(generate_spectra(header, measurementtimes_ns, peakamplitudes, params, spectra))
        # fill in pulse, gradient, acq data
        w.write_data(generate_stream(raw_pulse_list))
        w.write_data(generate_stream(raw_gradient_list))
        w.write_data(generate_stream(raw_acquisition_list))
        if(len(auximages) > 0):
            w.write_data(generate_aux_images(auximages))

if __name__ == '__main__':
    params = {
        'sourcepeak': 1,
        'metabolitelist': [2, 3, 4],
        'biggestpeakidx': [0, 1],
        'peakoffsets': [0.0, 8.6, 13.0, 18.1, 21.8],
        'peaknames': ['urea', 'KIC', 'leu', 'hyd', '?'],
        'wigglefactor': 1.0
    }
    write_spectral_mrd('raw.mrd2', params)