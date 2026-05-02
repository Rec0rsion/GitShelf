package com.gitsync.app;

import android.graphics.Rect;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable Edge-to-Edge
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            decorViewEdgeToEdge();
        }

        // Transparent Status and Navigation Bars
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
            getWindow().setNavigationBarColor(android.graphics.Color.TRANSPARENT);
        }

        registerPlugin(GitSyncNativePlugin.class);
    }

    private void decorViewEdgeToEdge() {
        View decorView = getWindow().getDecorView();
        int flags = decorView.getSystemUiVisibility();
        flags |= View.SYSTEM_UI_FLAG_LAYOUT_STABLE
               | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
               | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
        decorView.setSystemUiVisibility(flags);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            View decorView = getWindow().getDecorView();
            int width = decorView.getWidth();
            int height = decorView.getHeight();
            int exclusionWidth = (int) (40 * getResources().getDisplayMetrics().density);
            
            List<Rect> rects = new ArrayList<>();
            // Left edge exclusion
            rects.add(new Rect(0, 0, exclusionWidth, height));
            // Right edge exclusion
            rects.add(new Rect(width - exclusionWidth, 0, width, height));
            
            decorView.setSystemGestureExclusionRects(rects);
        }
    }
}
