#include "conflictcraft/hash.hpp"

#include <array>
#include <cstdint>
#include <iomanip>
#include <sstream>
#include <vector>

namespace {

constexpr std::array<uint32_t, 64> kRoundConstants = {
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
    0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
    0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
    0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
    0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
    0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
    0xc67178f2};

inline uint32_t rotate_right(uint32_t value, uint32_t count) {
  return (value >> count) | (value << (32 - count));
}

inline uint32_t choose(uint32_t x, uint32_t y, uint32_t z) {
  return (x & y) ^ (~x & z);
}

inline uint32_t majority(uint32_t x, uint32_t y, uint32_t z) {
  return (x & y) ^ (x & z) ^ (y & z);
}

inline uint32_t sigma0(uint32_t x) {
  return rotate_right(x, 2) ^ rotate_right(x, 13) ^ rotate_right(x, 22);
}

inline uint32_t sigma1(uint32_t x) {
  return rotate_right(x, 6) ^ rotate_right(x, 11) ^ rotate_right(x, 25);
}

inline uint32_t gamma0(uint32_t x) {
  return rotate_right(x, 7) ^ rotate_right(x, 18) ^ (x >> 3);
}

inline uint32_t gamma1(uint32_t x) {
  return rotate_right(x, 17) ^ rotate_right(x, 19) ^ (x >> 10);
}

}  // namespace

namespace conflictcraft {

std::string sha256_hex(const std::string& input) {
  std::array<uint32_t, 8> hash_state = {
      0x6a09e667,
      0xbb67ae85,
      0x3c6ef372,
      0xa54ff53a,
      0x510e527f,
      0x9b05688c,
      0x1f83d9ab,
      0x5be0cd19,
  };

  std::vector<uint8_t> padded(input.begin(), input.end());
  const uint64_t bit_len = static_cast<uint64_t>(padded.size()) * 8ULL;
  padded.push_back(0x80);
  while ((padded.size() % 64) != 56) {
    padded.push_back(0x00);
  }
  for (int i = 7; i >= 0; --i) {
    padded.push_back(static_cast<uint8_t>((bit_len >> (i * 8)) & 0xff));
  }

  for (std::size_t chunk_start = 0; chunk_start < padded.size(); chunk_start += 64) {
    std::array<uint32_t, 64> w{};
    for (std::size_t i = 0; i < 16; ++i) {
      const std::size_t offset = chunk_start + (i * 4);
      w[i] = (static_cast<uint32_t>(padded[offset]) << 24) |
             (static_cast<uint32_t>(padded[offset + 1]) << 16) |
             (static_cast<uint32_t>(padded[offset + 2]) << 8) |
             static_cast<uint32_t>(padded[offset + 3]);
    }
    for (std::size_t i = 16; i < 64; ++i) {
      w[i] = gamma1(w[i - 2]) + w[i - 7] + gamma0(w[i - 15]) + w[i - 16];
    }

    uint32_t a = hash_state[0];
    uint32_t b = hash_state[1];
    uint32_t c = hash_state[2];
    uint32_t d = hash_state[3];
    uint32_t e = hash_state[4];
    uint32_t f = hash_state[5];
    uint32_t g = hash_state[6];
    uint32_t h = hash_state[7];

    for (std::size_t i = 0; i < 64; ++i) {
      const uint32_t t1 = h + sigma1(e) + choose(e, f, g) + kRoundConstants[i] + w[i];
      const uint32_t t2 = sigma0(a) + majority(a, b, c);
      h = g;
      g = f;
      f = e;
      e = d + t1;
      d = c;
      c = b;
      b = a;
      a = t1 + t2;
    }

    hash_state[0] += a;
    hash_state[1] += b;
    hash_state[2] += c;
    hash_state[3] += d;
    hash_state[4] += e;
    hash_state[5] += f;
    hash_state[6] += g;
    hash_state[7] += h;
  }

  std::ostringstream out;
  out << std::hex << std::setfill('0');
  for (const auto value : hash_state) {
    out << std::setw(8) << value;
  }
  return out.str();
}

}  // namespace conflictcraft

