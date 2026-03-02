# Phase 6: Caching & Web Search - 결과 문서

## 완료 상태: ✅ 완료 (Agent E)

## 수행 내용

### 생성된 파일 (6개)

#### 1. `src/services/cacheService.js`
- **Qdrant 벡터 DB 연동**
- `cacheEnabled`: Qdrant 가용성 체크 (2초 타임아웃)
- `initCache()`: 컬렉션 생성 (768차원, 코사인 거리)
- `getEmbedding(text)`: Gemini text-embedding-004 호출
- `searchCache(query, threshold=0.9)`: 유사 질문 검색
- `addToCache(query, response, relatedSections)`: 캐시 저장
- Qdrant 미실행 시 null 반환 (크래시 방지)

#### 2. `src/services/searchService.js`
- **Tavily API 연동**
- `isExternalQuestion(message)`: 20개 내부 키워드로 분류
- `searchWeb(query)`: Tavily 검색 (basic, max 3, answer 포함)
- API 키 미설정/에러 시 null 반환

#### 3. `api/chat.js`
- **서버리스 API** (Vercel/Cloudflare 호환)
- POST 핸들러, CORS 지원
- Gemini 스트리밍 SSE 응답
- 서버 측 API 키 보호 (GEMINI_API_KEY)

#### 4. `api/search.js`
- **서버리스 API** (Vercel/Cloudflare 호환)
- POST 핸들러, CORS 지원
- Tavily API 프록시

#### 5. `docker-compose.yml`
- Qdrant 컨테이너: REST 6333, gRPC 6334
- 영구 볼륨: qdrant_data

#### 6. `.env.example`
```
VITE_GEMINI_API_KEY=
VITE_TAVILY_API_KEY=
VITE_QDRANT_URL=http://localhost:6333
```
