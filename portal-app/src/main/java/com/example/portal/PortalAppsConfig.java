package com.example.portal;

import io.smallrye.config.ConfigMapping;
import java.util.List;
import java.util.Optional;

/**
 * The launcher's tile list. Deployment configuration, not data: module URLs differ per
 * environment, which is why the portal needs no database.
 */
@ConfigMapping(prefix = "portal")
public interface PortalAppsConfig {

    List<App> apps();

    interface App {
        String id();

        String name();

        String description();

        String url();

        Optional<String> icon();
    }
}
