from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, Response
from src.router import v1_router
from src.utils.draft_downloader import download_draft
from src.utils.logger import logger
from src.middlewares import PrepareMiddleware, ResponseMiddleware


from fastapi.staticfiles import StaticFiles
import os

# 1. 创建 FastAPI 应用
app: FastAPI = FastAPI(title="CapCut Mate API", version="1.0")

# 1.5 Streaming video endpoint with Range support for large files
os.makedirs("output/draft", exist_ok=True)

@app.get("/output/draft/{filename}")
async def stream_video(filename: str, request: Request):
    """Stream video files with HTTP Range support for seeking in browser."""
    file_path = os.path.join("output", "draft", filename)
    if not os.path.isfile(file_path):
        return Response(status_code=404, content="File not found")
    
    file_size = os.path.getsize(file_path)
    content_type = "video/mp4" if filename.endswith(".mp4") else "application/octet-stream"
    
    range_header = request.headers.get("range")
    if range_header:
        # Parse Range: bytes=start-end
        range_spec = range_header.replace("bytes=", "")
        parts = range_spec.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1
        
        def iter_file():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    read_size = min(remaining, 1024 * 1024)  # 1MB chunks
                    data = f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        return StreamingResponse(
            iter_file(),
            status_code=206,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
                "Content-Type": content_type,
            },
        )
    else:
        # No Range header — stream the whole file
        def iter_full():
            with open(file_path, "rb") as f:
                while chunk := f.read(1024 * 1024):
                    yield chunk
        
        return StreamingResponse(
            iter_full(),
            headers={
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Content-Type": content_type,
            },
        )

# 1.6 挂载静态文件目录 (for non-draft files)
app.mount("/output", StaticFiles(directory="output"), name="output")

# 2. 注册路由
app.include_router(router=v1_router, prefix="/openapi/capcut-mate", tags=["capcut-mate"])

# 3. 添加中间件
app.add_middleware(middleware_class=PrepareMiddleware)
# 注册统一响应处理中间件（注意顺序，应该在其他中间件之后注册）
app.add_middleware(middleware_class=ResponseMiddleware)

# 4. 打印所有路由
for r in app.routes:
    # 1. 取 HTTP 方法列表
    methods = getattr(r, "methods", None) or [getattr(r, "method", "WS")]
    # 2. 安全地取路径
    path = getattr(r, "path", "<unknown>")
    # 3. 安全地取函数名
    name = getattr(r, "name", "<unnamed>")
    logger.info("Route: %s %s -> %s", ",".join(sorted(methods)), path, name)

logger.info("CapCut Mate API")

# 5. 启动
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=30000, log_config=None, log_level="info")