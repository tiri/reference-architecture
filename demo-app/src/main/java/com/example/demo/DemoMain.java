package com.example.demo;

import com.example.demo.job.BatchRunner;
import io.quarkus.arc.Arc;
import io.quarkus.logging.Log;
import io.quarkus.runtime.Quarkus;
import io.quarkus.runtime.QuarkusApplication;
import io.quarkus.runtime.annotations.QuarkusMain;

/**
 * One artifact, two ways to start it:
 *
 * <ul>
 * <li>without arguments — the module serves its UI and API;</li>
 * <li>with {@code --batch} — one pass over the open change requests, then exit.</li>
 * </ul>
 *
 * <p>The scheduled run is the same image with the other start option, so there is no
 * second implementation, no second artifact and no endpoint that triggers work. When and
 * how often it runs belongs to the runtime environment, not to this repository.
 */
@QuarkusMain
public class DemoMain implements QuarkusApplication {

    public static void main(String... args) {
        Quarkus.run(DemoMain.class, args);
    }

    @Override
    public int run(String... args) {
        boolean batchMode = args.length > 0 && "--batch".equals(args[0]);
        if (batchMode) {
            int applied = Arc.container().instance(BatchRunner.class).get().runOnce();
            Log.infof("batch run finished, %d change request(s) applied", applied);
            return 0;
        }
        Quarkus.waitForExit();
        return 0;
    }
}
