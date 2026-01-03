#!/bin/bash

curl -o MoproFfiFramework.xcframework.zip https://ci-keys.zkmopro.org/MoproFfiFramework.xcframework.zip \
&& unzip -o -q MoproFfiFramework.xcframework.zip \
&& rm -f MoproFfiFramework.xcframework.zip
