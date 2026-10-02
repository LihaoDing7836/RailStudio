# Third-party notices

## XTrackCAD parameter library

Authors include Dwyane Ward, Dave Bullis, and other XTrackCAD contributors. Original author notices are retained in the bundled source parameter files.

License: GNU GPL version 2, reproduced in LICENSE and dist/licenses/COPYING.

Sources retrieved 2026-09-26:

- https://sourceforge.net/p/xtrkcad-fork/xtrkcad/ci/default/tree/app/lib/params/N-Tomix%20Track.xtp
- https://sourceforge.net/p/xtrkcad-fork/xtrkcad/ci/default/tree/app/lib/params/N-Kato%20Track%20and%20Structures.xtp
- https://sourceforge.net/p/xtrkcad-fork/xtrkcad/ci/default/tree/app/lib/params/HO-Kato.xtp
- https://sourceforge.net/p/xtrkcad-fork/xtrkcad/ci/default/tree/app/lib/params/N-Kato-Unitram.xtp
- https://sourceforge.net/p/xtrkcad-fork/xtrkcad/ci/default/tree/app/lib/params/N-kato-turntable.xtp
- Older parameter files and license: https://github.com/sharkcz/xtrkcad/tree/hg/app/lib

Modifications made on 2026-09-26: conversion of track segments and exposed connection ports from XTP inches into JSON millimetres, coordinate normalization, omission of decorative graphics, association with current catalog entries, and turntable bridge presentation. Raw sources, converter, and license are included in the downloadable source archive. Imported data is not manufacturer-certified.

## Manufacturer catalogs

Catalog identifiers and dimensional product facts are sourced from TOMIX and KATO public Japanese catalogs. Per-part links are included in catalog.json. Product photography and descriptive articles are not redistributed. Brand and product names remain the property of their respective owners.

## Three.js 0.180.0

3D rendering and OrbitControls use Three.js, copyright © 2010–2025 three.js authors, under the MIT License. The full license is included at `dist/lib/three/LICENSE`.

Source: https://github.com/mrdoob/three.js/tree/r180
Pinned distribution: https://www.npmjs.com/package/three/v/0.180.0
OrbitControls' module import has been changed to a relative local path. All rendering dependencies are hosted with this site; no runtime CDN is required.
