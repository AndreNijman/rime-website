// clockshift.so — the shell's clocks, moved and (optionally) dilated.
// LD_PRELOADed into the captured shell process only.
//
//   CLOCKSHIFT_EPOCH=<unix seconds>   the wall clock starts there when the
//                                     process first asks, so every capture
//                                     session opens on the same minute and no
//                                     clip shows a clock that jumps;
//   CLOCKSHIFT_DILATE=<factor>        every clock the process reads, wall and
//                                     monotonic, runs that many times slower.
//
// Dilation is how the website's recordings get enough frames: the shell runs
// at its own default settings, but everything it perceives (springs stepped on
// Date.now(), Qt's animations and timers, the seconds it draws) happens that
// many times slower, and a recording played back that much faster is the
// shell at real speed in every respect, the ticking clock included.
#define _GNU_SOURCE
#include <dlfcn.h>
#include <stdlib.h>
#include <sys/time.h>
#include <time.h>

static long long wall_off, wall0, mono0, boot0;
static double dilate = 1.0;
static int ready;
static int (*real_clock_gettime)(clockid_t, struct timespec *);

static long long ns_of(const struct timespec *t) { return (long long)t->tv_sec * 1000000000LL + t->tv_nsec; }
static void set_ns(struct timespec *t, long long ns) { t->tv_sec = ns / 1000000000LL; t->tv_nsec = ns % 1000000000LL; }

static void setup(void) {
    real_clock_gettime = dlsym(RTLD_NEXT, "clock_gettime");
    struct timespec t;
    real_clock_gettime(CLOCK_REALTIME, &t);  wall0 = ns_of(&t);
    real_clock_gettime(CLOCK_MONOTONIC, &t); mono0 = ns_of(&t);
    real_clock_gettime(CLOCK_BOOTTIME, &t);  boot0 = ns_of(&t);
    const char *e = getenv("CLOCKSHIFT_EPOCH");
    wall_off = e ? atoll(e) * 1000000000LL - wall0 : 0;
    const char *d = getenv("CLOCKSHIFT_DILATE");
    if (d && atof(d) > 0) dilate = atof(d);
    ready = 1;
}

__attribute__((constructor)) static void early(void) { if (!ready) setup(); }

static long long slow(long long real, long long origin) {
    return dilate == 1.0 ? real : origin + (long long)((real - origin) / dilate);
}

int clock_gettime(clockid_t c, struct timespec *ts) {
    if (!ready) setup();
    int r = real_clock_gettime(c, ts);
    if (r != 0) return r;
    switch (c) {
        case CLOCK_REALTIME: case CLOCK_REALTIME_COARSE: case CLOCK_TAI:
            set_ns(ts, slow(ns_of(ts), wall0) + wall_off); break;
        case CLOCK_MONOTONIC: case CLOCK_MONOTONIC_COARSE: case CLOCK_MONOTONIC_RAW:
            set_ns(ts, slow(ns_of(ts), mono0)); break;
        case CLOCK_BOOTTIME:
            set_ns(ts, slow(ns_of(ts), boot0)); break;
        default: break;
    }
    return r;
}

int gettimeofday(struct timeval *restrict tv, void *restrict tz) {
    (void)tz;
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    tv->tv_sec = ts.tv_sec; tv->tv_usec = ts.tv_nsec / 1000;
    return 0;
}

time_t time(time_t *t) {
    struct timespec ts;
    clock_gettime(CLOCK_REALTIME, &ts);
    if (t) *t = ts.tv_sec;
    return ts.tv_sec;
}
