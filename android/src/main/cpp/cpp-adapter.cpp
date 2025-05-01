#include <jni.h>
#include "NitroSpotifySdkOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::spotifysdk::initialize(vm);
}
