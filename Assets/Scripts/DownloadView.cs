using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class DownloadView : MonoBehaviour
{
    [SerializeField] private TMP_Text displayText;
    [SerializeField] private Button submitButton;
    [SerializeField] private Button editButton;
    [SerializeField] private TMP_InputField input;
    [SerializeField] private RawImage imagePreview;


    private bool downloading = false;

    private void Start()
    {
        submitButton.onClick.AddListener(InitiateDownload);
        editButton.onClick.AddListener(EditUrl);
        WebDownloader.DownloadCompleted += OnDownloadCompleted;
    }

    private void EditUrl()
    {
        input.text = WebDownloader.promptForStringInput();
    }

    private void InitiateDownload()
    {
        if (downloading)
        {
            displayText.text = "busy!";
            return;
        }

        downloading = true;

        displayText.text = $"Now downloading: {input.text}";
        WebDownloader.Download(input.text);
    }

    private void OnDownloadCompleted(byte[] bytes)
    {
        if (bytes != null)
        {
            displayText.text = $"Download completed: received {bytes.Length} bytes.";
        }
        else
        {
            displayText.text = $"Download failed.";
            downloading = false;
            return;
        }

        try
        {
            var tex = new Texture2D(512, 512);
            tex.LoadImage(bytes);
            tex.Apply();
            imagePreview.texture = tex;
        }
        catch (Exception e)
        {
            Debug.Log("Failed to convert bytes to image: " + e.Message);
        }

        downloading = false;
    }
}