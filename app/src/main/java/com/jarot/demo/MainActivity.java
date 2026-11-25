package com.jarot.demo;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.TextView;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        TextView label = new TextView(this);
        label.setText("Hello dari Jarot Demo!");
        label.setTextSize(22f);
        label.setTextColor(Color.parseColor("#EDF2F7"));
        label.setGravity(Gravity.CENTER);

        setContentView(label);
    }
}
