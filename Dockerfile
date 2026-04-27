FROM node:20-alpine AS frontend
WORKDIR /build
COPY website/package*.json ./
RUN npm install --legacy-peer-deps
COPY website/ ./
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
COPY --from=frontend /build/dist ./website/dist
EXPOSE 8080
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8080"]
