(() => {
G.fileData = `
meet WZ_AGC 2024 Western Zone Age Group Championships (8/5/2024)
table WZ_AGC:0-10 F:SCY F:SCM F:LCM EVENT M:LCM M:SCM M:SCY

28.89 31.89 32.79 50FR 32.79 31.59 28.59
1:04.19 1:10.89 1:13.09 100FR 1:12.89 1:10.29 1:03.69
2:20.89 2:35.79 2:39.79 200FR 2:36.59 2:31.29 2:16.89
33.29 36.79 38.89 50BK 38.89 37.09 33.49
1:11.79 1:19.29 1:23.89 100BK 1:22.89 1:19.79 1:11.89
37.89 41.89 43.09 50BR 42.69 41.19 37.29
1:23.09 1:31.89 1:34.89 100BR 1:33.79 1:30.99 1:22.19
32.49 35.89 36.59 50FL 36.29 35.29 31.99
1:14.19 1:21.99 1:24.59 100FL 1:23.59 1:21.69 1:13.19
2:37.39 2:53.99 2:59.59 200IM 2:58.39 2:52.49 2:36.19

table WZ_AGC:11-12 F:SCY F:SCM F:LCM EVENT M:LCM M:SCM M:SCY

26.59 29.59 30.39 50FR 29.29 28.29 25.59
57.79 1:03.89 1:06.09 100FR 1:03.89 1:01.69 55.79
2:05.99 2:19.99 2:23.19 200FR 2:19.49 2:15.19 2:01.39
5:36.89 4:55.09 5:01.69 400FR 4:55.09 4:46.89 5:27.89
29.99 33.29 34.49 50BK 33.69 32.49 29.29
1:04.69 1:11.89 1:15.39 100BK 1:12.99 1:09.39 1:02.79
2:18.79 2:33.39 2:40.69 200BK 2:36.69 2:29.89 2:15.19
33.79 37.39 38.49 50BR 37.49 36.19 32.69
1:13.19 1:21.19 1:24.79 100BR 1:22.19 1:18.79 1:10.49
2:37.89 2:56.39 3:02.79 200BR 2:56.59 2:49.29 2:32.49
28.69 31.89 32.39 50FL 31.89 31.19 28.19
1:04.19 1:11.49 1:13.09 100FL 1:10.89 1:09.39 1:02.39
2:21.39 2:36.99 2:40.99 200FL 2:37.49 2:33.29 2:16.09
2:21.59 2:36.89 2:41.89 200IM 2:37.79 2:31.99 2:17.29
5:01.89 5:33.59 5:45.49 400IM 5:37.79 5:23.89 4:53.19

table WZ_AGC:13-14 F:SCY F:SCM F:LCM EVENT M:LCM M:SCM M:SCY

25.59 28.39 29.19 50FR 27.09 26.09 23.49
55.49 1:01.49 1:03.29 100FR 59.09 56.99 51.59
1:59.49 2:12.99 2:16.89 200FR 2:08.89 2:04.19 1:52.39
5:20.39 4:41.49 4:48.19 400FR 4:34.29 4:25.89 5:03.79
11:01.59 9:38.99 9:53.99 800FR 9:30.29 9:10.89 10:29.49
18:22.79 18:16.29 18:56.49 1500FR 18:09.39 17:25.89 17:31.99
1:00.19 1:06.99 1:10.69 100BK 1:05.89 1:02.59 56.19
2:11.09 2:25.29 2:31.19 200BK 2:23.09 2:16.39 2:02.79
1:09.09 1:16.99 1:20.19 100BR 1:14.59 1:10.69 1:03.89
2:29.99 2:46.69 2:52.59 200BR 2:41.39 2:34.89 2:18.79
59.99 1:06.79 1:08.09 100FL 1:03.89 1:01.99 55.89
2:12.79 2:27.69 2:31.69 200FL 2:22.19 2:17.49 2:04.29
2:13.39 2:28.89 2:33.89 200IM 2:25.09 2:18.89 2:05.69
4:45.69 5:17.59 5:26.49 400IM 5:08.59 4:56.79 4:28.29

# meet WZ_SRC [2025 Western Zone Senior Championships](https://www.pacswim.org/swim-meet-times/standards)

# table WZ_SRC:SCY:13-18 F EVENT M

# 26.09 50FR 23.29
# 56.59 100FR 51.19
# 2:02.69 200FR 1:52.09
# 5:29.09 500FR 5:04.39
# 11:21.19 1000FR 10:34.99
# 18:57.79 1650FR 17:44.09
# 1:01.39 100BK 55.99
# 2:13.89 200BK 2:01.59
# 1:10.49 100BR 1:02.89
# 2:32.79 200BR 2:18.19
# 1:01.39 100FL 55.49
# 2:15.79 200FL 2:04.29
# 2:16.99 200IM 2:04.69
# 4:52.29 400IM 4:28.59

# table WZ_SRC:LCM:13-18 F EVENT M

# 29.89 50FR 26.79
# 1:04.99 100FR 59.19
# 2:20.09 200FR 2:09.29
# 4:54.49 400FR 4:34.19
# 10:08.99 800FR 9:35.09
# 19:29.59 1500FR 18:11.69
# 1:11.79 100BK 1:05.89
# 2:34.79 200BK 2:22.69
# 1:21.69 100BR 1:13.79
# 2:57.39 200BR 2:40.49
# 1:10.09 100FL 1:03.59
# 2:33.89 200FL 2:21.49
# 2:37.59 200IM 2:25.09
# 5:35.09 400IM 5:07.29

meet WZ_SRC [2025 SC Western Zone Senior Championships](https://www.gomotionapp.com/team/lscuts/page/times/time-standards)

table WZ_SRC:13-18 F:SCY F:SCM F:LCM EVENT M:LCM M:SCM M:SCY

26.09 28.89 29.59 50FR 26.99 25.69 23.19
56.49 1:02.39 1:04.39 100FR 58.99 56.29 50.99
2:02.39 2:15.29 2:18.99 200FR 2:08.69 2:03.49 1:51.79
5:29.39 4:48.19 4:51.79 500FR 4:34.39 4:24.79 5:02.69
11:24.19 9:58.69 10:05.99 800FR 9:29.99 9:14.79 10:33.99
19:06.69 18:59.79 19:21.09 1500FR 18:11.09 17:30.49 17:36.89
1:01.39 1:07.79 1:11.39 100BK 1:05.19 1:01.29 55.49
2:13.29 2:27.29 2:33.39 200BK 2:21.49 2:13.99 2:01.29
1:10.59 1:17.99 1:20.99 100BR 1:13.49 1:09.79 1:03.19
2:32.79 2:48.79 2:54.49 200BR 2:39.79 2:31.69 2:17.29
1:01.09 1:07.49 1:09.29 100FL 1:03.09 1:00.99 55.19
2:16.19 2:30.49 2:34.29 200FL 2:21.09 2:16.39 2:03.39
2:16.49 2:30.79 2:36.99 200IM 2:24.69 2:16.99 2:03.99
4:51.59 5:22.29 5:32.49 400IM 5:07.79 4:52.39 4:24.69

`;
})();