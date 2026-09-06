package com.frontend;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

import expo.modules.ReactActivityDelegateWrapper;

public class MainActivity extends ReactActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        normalizeSharedText(getIntent());
        super.onCreate(null);
    }

    @Override
    public void onNewIntent(Intent intent) {
        normalizeSharedText(intent);
        setIntent(intent);
        super.onNewIntent(intent);
    }

    private void normalizeSharedText(Intent intent) {
        if (intent == null
            || !Intent.ACTION_SEND.equals(intent.getAction())
            || intent.getType() == null
            || !intent.getType().startsWith("text/")) {
            return;
        }

        String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (sharedText == null || sharedText.trim().isEmpty()) {
            return;
        }

        intent.setData(new Uri.Builder()
            .scheme("memoa")
            .authority("capture")
            .appendQueryParameter("text", sharedText.trim())
            .build());
    }

    @Override
    protected String getMainComponentName() {
        return "FrontEnd";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new ReactActivityDelegateWrapper(
            this,
            new DefaultReactActivityDelegate(
                this,
                getMainComponentName(),
                BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
            )
        );
    }
}
