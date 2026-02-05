# Local LLM Summarization Server Tuning Report (LM Studio + Qwen2.5 32B)

## Goal

Optimize a local document-summarization server (OpenAI-compatible `/v1/chat/completions`) to reduce latency—especially generation time—while maintaining stability on a 16GB VRAM GPU.

---

## Hardware

- **CPU**: Intel 12th Gen Core i5-12400F (2.50 GHz)
- **GPU**: NVIDIA GeForce RTX 5060 Ti (**16GB VRAM**)
- **RAM**: 32GB (2666 MT/s)
- **Storage**: 1.82TB

---

## Model / Runtime

- **Model**: Qwen2.5 32B Instruct (GGUF)
- **Runtime**: LM Studio Local Server (OpenAI-compatible)

---

## Problem (Baseline)

- Initial configuration used **max context (32K)** and low/inefficient GPU utilization, causing very slow generation.

### Baseline Performance (from server logs)

- **Generation speed (eval)**: **0.86 tok/s**
- **Total time**: **154.28s**  
  (132 output tokens; `eval time = 152.99s`, `total time = 154.28s`)

---

## Tuning Changes (Applied in Order)

1. **Context Length**: **32K → 8K (8192)**
   - Reduced KV cache pressure and improved stability/performance.
2. **Max Concurrent Predictions**: **4 → 1**
   - Prevented KV/VRAM fragmentation and improved throughput.
3. **GPU Offload**: **0 (or very low) → 36 → 46**
   - Increased GPU-resident layers to accelerate generation.
4. **Evaluation Batch Size**: **256 → 512**
   - Improved prompt processing throughput.
5. **Flash Attention**: **ON**
6. **KV Cache Quantization**: **K/V = Q8**
7. **Offload KV Cache to GPU Memory**: **ON**
8. **Unified KV Cache**: **ON**
9. **Prompt Cache**: leveraged for repeated/related requests (reduces prompt reprocessing)

---

## Performance Results (Before → After)

Metrics from `slot print_timing` logs:

|                 Stage | Key Setting          |                     Prompt eval | Generation eval |  Total time |
| --------------------: | -------------------- | ------------------------------: | --------------: | ----------: |
|              Baseline | `n_ctx_slot=32768`   | (not comparable due to caching) |  **0.86 tok/s** | **154.28s** |
|                Mid #1 | `n_ctx_slot=8192`    |                   **146 tok/s** |  **1.74 tok/s** |  **94.68s** |
|                Mid #2 | batch/cache tuning   |                   **285 tok/s** |  **2.87 tok/s** |  **46.07s** |
| Final (best observed) | batch 512 + offload↑ |                   **344 tok/s** |  **3.56 tok/s** |  **43.67s** |

### Improvement Summary

- **Generation speed (eval tok/s)**: **0.86 → 3.56** (**~4.14× faster**)
- **Total time**: **154.28s → 43.67s** (**~3.53× faster**, ~71.7% reduction)

---

## Final Recommended Settings (Current)

- **Context Length**: 8192
- **GPU Offload**: 46
- **Evaluation Batch Size**: 512
- **Max Concurrent Predictions**: 1
- **Flash Attention**: ON
- **KV Cache Quantization**: K=Q8, V=Q8
- **Offload KV Cache to GPU Memory**: ON
- **Unified KV Cache**: ON

---

# 로컬 LLM 문서 요약 서버 튜닝 리포트 (LM Studio + Qwen2.5 32B)

## 목적

로컬 문서 요약 서버(OpenAI 호환 `/v1/chat/completions`)의 응답 지연을 줄이기 위해, 특히 **출력 생성 단계(eval)** 성능을 개선하면서 16GB VRAM 환경에서 안정적으로 운영할 수 있도록 설정을 최적화한다.

---

## 하드웨어 사양

- **CPU**: Intel 12th Gen Core i5-12400F (2.50 GHz)
- **GPU**: NVIDIA GeForce RTX 5060 Ti (**VRAM 16GB**)
- **RAM**: 32GB (2666 MT/s)
- **저장소**: 1.82TB

---

## 모델 / 런타임

- **모델**: Qwen2.5 32B Instruct (GGUF)
- **런타임**: LM Studio Local Server (OpenAI 호환)

---

## 문제(초기 상태)

- 초기 설정에서 **최대 컨텍스트(32K)** 사용 및 GPU 활용이 비효율적이어서 **출력 생성 속도가 매우 느림**.

### 초기 성능(서버 로그 기준)

- **생성 속도(eval)**: **0.86 tok/s**
- **총 소요 시간**: **154.28s**  
  (출력 132 tokens; `eval time = 152.99s`, `total time = 154.28s`)

---

## 적용한 튜닝 변경 사항(순서)

1. **컨텍스트 길이(Context Length)**: **32K → 8K (8192)**
   - KV cache 메모리 부담을 낮춰 성능/안정성 개선.
2. **동시 예측 수(Max Concurrent Predictions)**: **4 → 1**
   - KV/VRAM이 쪼개지는 문제를 방지하고 처리량 개선.
3. **GPU 오프로딩(GPU Offload)**: **0(또는 매우 낮음) → 36 → 46**
   - 가능한 많은 레이어를 GPU에 올려 **생성 속도 개선**.
4. **평가 배치 크기(Evaluation Batch Size)**: **256 → 512**
   - 입력(프롬프트) 처리 속도 향상.
5. **Flash Attention**: **ON**
6. **KV Cache 양자화(KV Cache Quantization)**: **K/V = Q8**
7. **KV Cache GPU 오프로딩(Offload KV Cache to GPU Memory)**: **ON**
8. **Unified KV Cache**: **ON**
9. **Prompt Cache**: 반복/유사 요청에서 프롬프트 재처리 비용 감소

---

## 성능 결과(전/후 비교)

`slot print_timing` 로그 기준:

|            단계 | 핵심 설정            |      입력 처리(prompt eval) |     생성(eval) |     총 시간 |
| --------------: | -------------------- | --------------------------: | -------------: | ----------: |
|            초기 | `n_ctx_slot=32768`   | (캐시 영향으로 비교 어려움) | **0.86 tok/s** | **154.28s** |
|         중간 #1 | `n_ctx_slot=8192`    |               **146 tok/s** | **1.74 tok/s** |  **94.68s** |
|         중간 #2 | 배치/캐시 반영       |               **285 tok/s** | **2.87 tok/s** |  **46.07s** |
| 최종(관측 최고) | 배치 512 + 오프로딩↑ |               **344 tok/s** | **3.56 tok/s** |  **43.67s** |

### 개선 요약

- **생성 속도(eval tok/s)**: **0.86 → 3.56** (**약 4.14배 향상**)
- **총 처리 시간**: **154.28s → 43.67s** (**약 3.53배 단축**, 약 71.7% 감소)

---

## 최종 권장 설정(현재)

- **Context Length**: 8192
- **GPU Offload**: 46
- **Evaluation Batch Size**: 512
- **Max Concurrent Predictions**: 1
- **Flash Attention**: ON
- **KV Cache Quantization**: K=Q8, V=Q8
- **Offload KV Cache to GPU Memory**: ON
- **Unified KV Cache**: ON
