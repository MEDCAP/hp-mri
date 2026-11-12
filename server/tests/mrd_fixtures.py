"""
MRD byte streams for tests. Kept apart from conftest so scripts/dev_ecs_smoke.py
can upload the same fixture to a deployed stack.
"""
import io

import numpy as np


def build_mrd_bytes():
    """
    A small MRD stream: two 4x4 magnitude images with two frequencies each
    (stacked into one image array of two measurements), and one waveform.
    The second image's values are 10x the first's, so scaling is visible.
    """
    import app.external.python.mrd as mrd  # pylint: disable=import-outside-toplevel

    def image(scale):
        data = np.arange(32, dtype=np.float32).reshape(1, 1, 4, 4, 2) * scale
        head = mrd.ImageHeader(image_type=mrd.ImageType.MAGNITUDE)
        return mrd.StreamItem.ImageFloat(mrd.ImageFloat(head=head, data=data))

    waveform = mrd.WaveformUint32(waveform_id=3, data=np.arange(10, dtype=np.uint32).reshape(1, 10))
    buffer = io.BytesIO()
    with mrd.BinaryMrdWriter(buffer) as writer:
        writer.write_header(mrd.Header())
        writer.write_data([image(1), image(10), mrd.StreamItem.WaveformUint32(waveform)])
    return buffer.getvalue()
