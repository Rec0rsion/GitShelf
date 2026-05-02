package com.gitsync.app;

import android.Manifest;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import android.app.Activity;
import java.io.File;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@CapacitorPlugin(
    name = "GitSyncNative",
    permissions = {
        @Permission(
            alias = "storage",
            strings = {Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE}
        ),
        @Permission(
            alias = "notifications",
            strings = {Manifest.permission.POST_NOTIFICATIONS}
        )
    }
)
public class GitSyncNativePlugin extends Plugin {
    private static final String TAG = "GitSyncNative";
    private final ConcurrentHashMap<Long, String> activeDownloadFilenames = new ConcurrentHashMap<>();
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private boolean isPolling = false;

    private final Runnable progressRunnable = new Runnable() {
        @Override
        public void run() {
            updateAllProgress();
            if (!activeDownloadFilenames.isEmpty()) {
                progressHandler.postDelayed(this, 1000);
            } else {
                isPolling = false;
            }
        }
    };

    private void updateAllProgress() {
        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null || activeDownloadFilenames.isEmpty()) return;

        for (Long downloadId : activeDownloadFilenames.keySet()) {
            DownloadManager.Query query = new DownloadManager.Query();
            query.setFilterById(downloadId);
            Cursor cursor = manager.query(query);

            if (cursor != null && cursor.moveToFirst()) {
                int bytesDownloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                int totalBytesIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);

                long bytesDownloaded = (bytesDownloadedIndex != -1) ? cursor.getLong(bytesDownloadedIndex) : 0;
                long totalBytes = (totalBytesIndex != -1) ? cursor.getLong(totalBytesIndex) : 0;
                int status = (statusIndex != -1) ? cursor.getInt(statusIndex) : -1;

                JSObject progress = new JSObject();
                progress.put("downloadId", downloadId.toString());
                progress.put("filename", activeDownloadFilenames.get(downloadId));
                progress.put("bytesDownloaded", bytesDownloaded);
                progress.put("totalBytes", totalBytes);
                
                int percent = (totalBytes > 0) ? (int) ((bytesDownloaded * 100) / totalBytes) : 0;
                progress.put("progress", percent);

                String statusStr = "UNKNOWN";
                if (status == DownloadManager.STATUS_PENDING) statusStr = "PENDING";
                if (status == DownloadManager.STATUS_RUNNING) statusStr = "RUNNING";
                if (status == DownloadManager.STATUS_SUCCESSFUL) statusStr = "SUCCESS";
                if (status == DownloadManager.STATUS_FAILED) statusStr = "FAILED";
                if (status == DownloadManager.STATUS_PAUSED) statusStr = "PAUSED";
                progress.put("status", statusStr);

                notifyListeners("downloadProgress", progress);
                
                if (status == DownloadManager.STATUS_SUCCESSFUL || status == DownloadManager.STATUS_FAILED) {
                    activeDownloadFilenames.remove(downloadId);
                }
                cursor.close();
            } else {
                activeDownloadFilenames.remove(downloadId);
            }
        }
    }

    @PluginMethod
    public void requestStoragePermission(PluginCall call) {
        if (getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallbackManual");
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void storagePermissionCallbackManual(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", getPermissionState("storage") == PermissionState.GRANTED);
        call.resolve(ret);
    }

    @PluginMethod
    public void downloadFile(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q && getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
            return;
        }

        executeDownload(call);
    }

    @com.getcapacitor.annotation.PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        executeDownload(call);
    }

    private void executeDownload(PluginCall call) {
        String url = call.getString("url");
        String filename = call.getString("filename", "file");
        // We no longer use a subfolder for downloads, staying in root Downloads as requested.
        // String folder = call.getString("folder", "GitShelf");

        if (url == null) {
            call.reject("Must provide an url");
            return;
        }

        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) {
            call.reject("DownloadManager not available");
            return;
        }

        // Use public Downloads directory directly to make files visible in the root Downloads folder
        File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (!downloadDir.exists()) {
            downloadDir.mkdirs();
        }

        Uri uri = Uri.parse(url);
        DownloadManager.Request request = new DownloadManager.Request(uri);

        request.setTitle(filename);
        request.setDescription("GitSync Background Download");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        
        try {
            // Set destination directly in the root public Downloads folder
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
        } catch (Exception e) {
            call.reject("Failed to set destination directory", e);
            return;
        }

        final long downloadId = manager.enqueue(request);
        activeDownloadFilenames.put(downloadId, filename);

        if (!isPolling) {
            isPolling = true;
            progressHandler.post(progressRunnable);
        }

        BroadcastReceiver onComplete = new BroadcastReceiver() {
            public void onReceive(Context ctxt, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id == downloadId) {
                    getContext().unregisterReceiver(this);
                    
                    DownloadManager.Query q = new DownloadManager.Query();
                    q.setFilterById(downloadId);
                    Cursor cursor = manager.query(q);
                    
                    if (cursor != null && cursor.moveToFirst()) {
                        int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                        if (statusIndex != -1) {
                            int status = cursor.getInt(statusIndex);
                            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                                File downloadedFile = new File(downloadDir, filename);
                                
                                JSObject completeData = new JSObject();
                                completeData.put("downloadId", String.valueOf(downloadId));
                                completeData.put("filename", filename);
                                completeData.put("path", downloadedFile.getAbsolutePath());
                                completeData.put("status", "SUCCESS");
                                notifyListeners("downloadComplete", completeData);

                                if (filename.toLowerCase().endsWith(".apk")) {
                                    installApk(downloadedFile);
                                }
                            } else if (status == DownloadManager.STATUS_FAILED) {
                                JSObject errorData = new JSObject();
                                errorData.put("downloadId", String.valueOf(downloadId));
                                errorData.put("status", "FAILED");
                                notifyListeners("downloadError", errorData);
                            }
                        }
                        cursor.close();
                    }
                    activeDownloadFilenames.remove(downloadId);
                }
            }
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }

        JSObject ret = new JSObject();
        ret.put("status", "started");
        ret.put("downloadId", String.valueOf(downloadId));
        call.resolve(ret);
    }

    @PluginMethod
    public void getDownloadStatus(PluginCall call) {
        String idStr = call.getString("downloadId");
        if (idStr == null) {
            call.reject("Must provide a downloadId");
            return;
        }

        long downloadId = Long.parseLong(idStr);
        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(downloadId);

        Cursor cursor = manager.query(query);
        if (cursor != null && cursor.moveToFirst()) {
            int bytesDownloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
            int totalBytesIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
            int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);

            long bytesDownloaded = (bytesDownloadedIndex != -1) ? cursor.getLong(bytesDownloadedIndex) : 0;
            long totalBytes = (totalBytesIndex != -1) ? cursor.getLong(totalBytesIndex) : 0;
            int status = (statusIndex != -1) ? cursor.getInt(statusIndex) : -1;

            JSObject ret = new JSObject();
            ret.put("bytesDownloaded", bytesDownloaded);
            ret.put("totalBytes", totalBytes);
            ret.put("status", status);
            
            String statusStr = "UNKNOWN";
            if (status == DownloadManager.STATUS_PENDING) statusStr = "PENDING";
            if (status == DownloadManager.STATUS_RUNNING) statusStr = "RUNNING";
            if (status == DownloadManager.STATUS_SUCCESSFUL) statusStr = "SUCCESS";
            if (status == DownloadManager.STATUS_FAILED) statusStr = "FAILED";
            if (status == DownloadManager.STATUS_PAUSED) statusStr = "PAUSED";
            ret.put("statusString", statusStr);

            cursor.close();
            call.resolve(ret);
        } else {
            call.reject("Download not found");
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        String idStr = call.getString("downloadId");
        if (idStr == null) {
            call.reject("Must provide a downloadId");
            return;
        }

        long downloadId = Long.parseLong(idStr);
        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        int removed = manager.remove(downloadId);
        activeDownloadFilenames.remove(downloadId);

        JSObject ret = new JSObject();
        ret.put("success", removed > 0);
        call.resolve(ret);
    }

    @PluginMethod
    public void getDownloads(PluginCall call) {
        File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        
        if (!downloadDir.exists()) {
            downloadDir.mkdirs();
        }

        File[] files = downloadDir.listFiles();
        com.getcapacitor.JSArray jsFiles = new com.getcapacitor.JSArray();

        if (files != null) {
            for (File file : files) {
                if (file.isFile()) {
                    JSObject jsFile = new JSObject();
                    jsFile.put("name", file.getName());
                    jsFile.put("path", file.getAbsolutePath());
                    jsFile.put("size", file.length());
                    jsFile.put("lastModified", file.lastModified());
                    jsFiles.put(jsFile);
                }
            }
        }

        JSObject ret = new JSObject();
        ret.put("files", jsFiles);
        call.resolve(ret);
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Must provide a path");
            return;
        }

        File file = new File(path);
        if (file.exists()) {
            boolean deleted = file.delete();
            JSObject ret = new JSObject();
            ret.put("success", deleted);
            call.resolve(ret);
        } else {
            call.reject("File does not exist");
        }
    }

    @PluginMethod
    public void openFile(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.reject("Must provide a path");
            return;
        }

        File file = new File(path);
        if (!file.exists()) {
            call.reject("File does not exist: " + path);
            return;
        }

        try {
            if (path.toLowerCase().endsWith(".apk")) {
                installApk(file);
            } else {
                Uri contentUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
                String mimeType = getContext().getContentResolver().getType(contentUri);
                if (mimeType == null) {
                    mimeType = "*/*";
                }
                
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(contentUri, mimeType);
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to open file: " + e.getMessage());
        }
    }

    private void installApk(File apkFile) {
        try {
            Uri contentUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "APK Installation failed", e);
        }
    }

    @PluginMethod
    public void getActiveDownloads(PluginCall call) {
        DownloadManager manager = (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterByStatus(DownloadManager.STATUS_RUNNING | DownloadManager.STATUS_PAUSED | DownloadManager.STATUS_PENDING);

        Cursor cursor = manager.query(query);
        com.getcapacitor.JSArray jsTasks = new com.getcapacitor.JSArray();

        if (cursor != null) {
            while (cursor.moveToNext()) {
                int idIndex = cursor.getColumnIndex(DownloadManager.COLUMN_ID);
                int titleIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TITLE);
                int bytesDownloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                int totalBytesIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);

                JSObject task = new JSObject();
                long id = cursor.getLong(idIndex);
                task.put("downloadId", String.valueOf(id));
                task.put("filename", cursor.getString(titleIndex));
                task.put("bytesDownloaded", cursor.getLong(bytesDownloadedIndex));
                task.put("totalBytes", cursor.getLong(totalBytesIndex));
                
                int status = cursor.getInt(statusIndex);
                String statusStr = "UNKNOWN";
                if (status == DownloadManager.STATUS_PENDING) statusStr = "PENDING";
                if (status == DownloadManager.STATUS_RUNNING) statusStr = "RUNNING";
                if (status == DownloadManager.STATUS_PAUSED) statusStr = "PAUSED";
                task.put("status", statusStr);

                jsTasks.put(task);

                // Side effect: re-add to our tracking map so polling continues if needed
                activeDownloadFilenames.put(id, cursor.getString(titleIndex));
            }
            cursor.close();
        }

        if (!activeDownloadFilenames.isEmpty() && !isPolling) {
            isPolling = true;
            progressHandler.post(progressRunnable);
        }

        JSObject ret = new JSObject();
        ret.put("downloads", jsTasks);
        call.resolve(ret);
    }

    @PluginMethod
    public void getStorageStats(PluginCall call) {
        File downloadDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        if (downloadDir == null) {
            call.reject("External storage not available");
            return;
        }
        android.os.StatFs stat = new android.os.StatFs(downloadDir.getPath());
        long blockSize = stat.getBlockSizeLong();
        long availableBlocks = stat.getAvailableBlocksLong();

        JSObject ret = new JSObject();
        ret.put("freeSpace", availableBlocks * blockSize);
        call.resolve(ret);
    }

    @PluginMethod
    public void pickFolder(PluginCall call) {
        saveCall(call);
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
                | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
        startActivityForResult(call, intent, "pickFolderResult");
    }

    @ActivityCallback
    private void pickFolderResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Uri treeUri = result.getData().getData();
            if (treeUri != null) {
                try {
                    getContext().getContentResolver().takePersistableUriPermission(treeUri,
                            Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

                    JSObject ret = new JSObject();
                    ret.put("uri", treeUri.toString());
                    ret.put("path", treeUri.getPath());
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Failed to take persistable permission: " + e.getMessage());
                }
            } else {
                call.reject("Selected folder URI was null");
            }
        } else {
            call.reject("User cancelled folder picker");
        }
    }

    @PluginMethod
    public void ping(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "GitSyncNative Bridge Connected");
        call.resolve(ret);
    }
}

