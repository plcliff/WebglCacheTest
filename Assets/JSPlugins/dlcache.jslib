// reference: https://discussions.unity.com/t/send-byte-array-from-js-to-unity/874743

const myLib = {
  // the $ syntax is a Unity specific thing? not sure. I'm just using it to hold some util funcs. See reference link for more details.
  $dlCacheUtils: {
    hashToValidFileName: function (str) {
      // this is a very crude convertion from string to a valid filename.
      return (str.replace(/[\/|\\:*?"<>]/g, " "));
    },

    isOpfsSupportedAsync: async function () {
      // we can optimize this by checking only once and storing the result
      if ("storage" in navigator && "getDirectory" in navigator.storage) {
        try {
          const opfsRoot = await navigator.storage.getDirectory();
          const directoryHandle = await opfsRoot.getDirectoryHandle("dlcache", { create: true });
          const fileHandle = await directoryHandle.getFileHandle("_test", { create: true });
          if ("createWritable" in fileHandle) {
            // safari currently doesn't support writing files unless you use a webworker (which I don't here)
            return true;
          } else {
            return false;
          }
        } catch (error) {
          console.log(error);
          return false;
        }
      }
      return false;
    },

    isCacheApiSupported: function () {
      return "caches" in window;
    },

    getFromCacheOrDownload: async function (url) {
      if (await dlCacheUtils.isOpfsSupportedAsync()) {
        // caching via OPFS
        try {
          const opfsRoot = await navigator.storage.getDirectory();
          const directoryHandle = await opfsRoot.getDirectoryHandle("dlcache", { create: true });
          const fileName = dlCacheUtils.hashToValidFileName(url);
          // throws NotFoundError if file doesn't exist
          const fileHandle = await directoryHandle.getFileHandle(fileName);
          const file = await fileHandle.getFile();
          console.log("Cached file found via OPFS, using it.");
          return file; // file is a special case of a blob
        } catch (error) {
          console.log("Error getting cached file, downloading it instead.");
        }
      } else if (dlCacheUtils.isCacheApiSupported()) {
        // caching via Cache API
        const cache = await caches.open('dlcache');
        const cachedResponse = await cache.match(url);
        if (cachedResponse && cachedResponse.ok) {
          console.log("Cached file found via Cache API, using it.");
          return await cachedResponse.blob();
        }
      }

      let response = undefined;
      let responseBlob = undefined;
      try {
        response = await fetch(url);
        responseBlob = await response.clone().blob();
      } catch (err) {
        console.log("Request failed " + err);
        return undefined;
      }

      if (await dlCacheUtils.isOpfsSupportedAsync()) {
        // caching via OPFS
        try {
          const opfsRoot = await navigator.storage.getDirectory();
          const directoryHandle = await opfsRoot.getDirectoryHandle("dlcache", { create: true });
          const fileName = dlCacheUtils.hashToValidFileName(url);
          const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(responseBlob);
          await writable.close();
        } catch (error) {
          console.log("Error saving file to OPFS: " + error);
        }
      } else if (dlCacheUtils.isCacheApiSupported()) {
        // caching via Cache API
        try {
          const cache = await caches.open('dlcache');
          await cache.put(url, response);
        } catch (error) {
          console.log("Error saving file to Cache API: " + error);
        }
      }

      return responseBlob;
    },

    sendToCallback: async function (contentBlob) {
      const callback = Module["dlCacheCallback"];
      if (contentBlob) {
        const contentBuffer = new Uint8Array(await contentBlob.arrayBuffer());
        const buffer = _malloc(contentBuffer.length);
        HEAPU8.set(contentBuffer, buffer);
        dynCall('viii', callback, [buffer, contentBuffer.length, 1]);
        _free(buffer);
      } else {
        // send an empty buffer
        const buffer = _malloc(8);
        dynCall('viii', callback, [buffer, 8, 0]);
        _free(buffer);
      }
    }
  },

  download: async function (urlBuf, callback) {
    Module["dlCacheCallback"] = callback; // we don't need to save the callback, but you can, and you will probably want to if initiating the download from the browser javascript side 

    const url = UTF8ToString(urlBuf);
    const contentBlob = await dlCacheUtils.getFromCacheOrDownload(url);
    await dlCacheUtils.sendToCallback(contentBlob);
  },


  // not related to download, but helpful for pasting urls 
  promptForStringInput: function () {
    const input = prompt("New url:", "");
    const bufferSize = lengthBytesUTF8(input) + 1;
    const buffer = _malloc(bufferSize);
    stringToUTF8(input, buffer, bufferSize);
    return buffer;
  }
}

autoAddDeps(myLib, "$dlCacheUtils"); // see reference link for why this is here

mergeInto(LibraryManager.library, myLib);