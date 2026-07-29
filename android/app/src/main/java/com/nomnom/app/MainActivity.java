package com.nomnom.app;

import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {

    @Override
    protected void load() {
        super.load();
        getBridge()
            .addWebViewListener(
                new WebViewListener() {
                    @Override
                    public boolean onRenderProcessGone(WebView webView, RenderProcessGoneDetail detail) {
                        Logger.error(
                            "WebView render process gone (didCrash=" + detail.didCrash() + "). Recreating activity."
                        );
                        runOnUiThread(
                            () -> {
                                if (!isFinishing() && !isDestroyed()) {
                                    recreate();
                                }
                            }
                        );
                        return true;
                    }
                }
            );
    }
}
