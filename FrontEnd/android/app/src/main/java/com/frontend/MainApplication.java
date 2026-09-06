package com.frontend;

import android.app.Application;
import android.content.res.Configuration;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactNativeApplicationEntryPoint;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultReactNativeHost;

import expo.modules.ApplicationLifecycleDispatcher;
import expo.modules.ExpoReactHostFactory;

import java.util.List;

@SuppressWarnings("deprecation")
public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost reactNativeHost = new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
            return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
            List<ReactPackage> packages = new PackageList(this).getPackages();
            packages.add(new MemoaNativePackage());
            return packages;
        }

        @Override
        protected String getJSMainModuleName() {
            return "index";
        }
    };

    private ReactHost reactHost;

    @Override
    public ReactNativeHost getReactNativeHost() {
        return reactNativeHost;
    }

    @Override
    public ReactHost getReactHost() {
        if (reactHost == null) {
            List<ReactPackage> packages = new PackageList(this).getPackages();
            packages.add(new MemoaNativePackage());
            reactHost = ExpoReactHostFactory.getDefaultReactHost(
                getApplicationContext(),
                packages,
                ".expo/.virtual-metro-entry",
                "index.android.bundle",
                null,
                null,
                BuildConfig.DEBUG,
                null
            );
        }
        return reactHost;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        ReactNativeApplicationEntryPoint.loadReactNative(this);
        ApplicationLifecycleDispatcher.onApplicationCreate(this);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig);
    }
}
