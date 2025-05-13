using System;
using System.Runtime.InteropServices;
using AOT;

public static class WebDownloader
{
    [DllImport("__Internal")]
    public static extern string promptForStringInput(); // not related to downloading but helpful for pasting urls
    
    [DllImport("__Internal")]
    private static extern void download(string url, Action<byte[], int, int> callback); // callback function must be static

    public static event Action<byte[]> DownloadCompleted;

    public static void Download(string url)
    {
        download(url, OnFileRetrieved);
    }

    [MonoPInvokeCallback(typeof(Action<byte[], int>))]
    public static void OnFileRetrieved([MarshalAs(UnmanagedType.LPArray, ArraySubType = UnmanagedType.U1, SizeParamIndex = 1)] byte[] bytes, int length, int success)
    {
        if (success != 0)
        {
            DownloadCompleted?.Invoke(bytes);
        }
        else
        {
            DownloadCompleted?.Invoke(null);
        }
    }
}