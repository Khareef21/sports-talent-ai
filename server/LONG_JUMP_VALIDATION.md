# Long Jump Accuracy Validation

Calibration confidence describes whether the geometry is usable; it does not establish measurement accuracy.

## Tape-measure procedure

1. Measure a known ground distance with a physical tape measure and record the ground truth in meters.
2. Place the reference object flat on the ground and fully visible.
3. Capture Image A with the measured ground dimensions and take-off line position.
4. Capture Image B from the pitch/runway scene with the reference object's exact dimensions.
5. Record one jump from the same camera scene.
6. Compare the returned `distance_m` with the tape-measured ground truth.
7. Report absolute error, percentage error, calibration confidence, measurement confidence, and uncertainty separately.

The result must be labeled estimated when no visible sand landing mark is available. It must not be presented as an official competition measurement.
