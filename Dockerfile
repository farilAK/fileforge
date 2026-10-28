FROM node:20-bookworm-slim

# Puppeteer sudah tidak dipakai, jadi jangan download Chromium (hemat waktu build dan ruang)
ENV PUPPETEER_SKIP_DOWNLOAD=true

# LibreOffice (Word -> PDF), Python + pdf2docx (PDF -> Word), dan font yang mirip font Word
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-writer \
      fonts-liberation \
      fonts-dejavu-core \
      fonts-crosextra-carlito \
      fonts-crosextra-caladea \
      python3 \
      python3-pip \
    && ln -s /usr/bin/python3 /usr/local/bin/python \
    && pip3 install --no-cache-dir --break-system-packages pdf2docx \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
