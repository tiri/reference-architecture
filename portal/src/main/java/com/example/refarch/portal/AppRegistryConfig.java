package com.example.refarch.portal;

import io.smallrye.config.ConfigMapping;

import java.util.List;

@ConfigMapping(prefix = "portal")
public interface AppRegistryConfig {

    List<AppEntry> apps();
    List<OrgEntry> orgs();

    interface AppEntry {
        String id();
        String name();
        String url();
        String description();
    }

    interface OrgEntry {
        String key();
        String value();
    }
}
