#!/bin/bash
# 사용법: ./notify.sh [waiting|stop|기타메시지]

MESSAGE=$1
TOPIC="ropeman-dev-noti-2026"

# 1. 상태에 따른 제목 및 아이콘(Tags) 분기
if [ "$MESSAGE" = "waiting" ]; then
    TITLE="⏳ Claude Code: 확인 필요"
    TAGS="speech_balloon,hourglass"
elif [ "$MESSAGE" = "stop" ]; then
    TITLE="✅ Claude Code: 중단/완료"
    TAGS="white_check_mark,rocket"
else
    TITLE="🔔 Claude Code: 알림"
    TAGS="bell"
fi

# 2. ntfy 전송 (Body에 $MESSAGE를 담아 보냄)
# &를 붙여 백그라운드에서 실행되게 하여 Claude Code의 흐름을 방해하지 않습니다.
curl -H "Title: $TITLE" \
     -H "Tags: $TAGS" \
     -d "$MESSAGE" \
     ntfy.sh/$TOPIC > /dev/null 2>&1 &