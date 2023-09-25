#include <stdint.h>
#include <string.h>
#include <stdlib.h>

#define AMOUNT_OF_ENTROPY (64)
static uint8_t entropy[AMOUNT_OF_ENTROPY];

// Current offset of where the next byte of entropy is
//
// if it is equal to the size of of the entropy pool, then there is no more entropy left
static size_t current_offset = sizeof(entropy);

/**
 * Overwrite entropy with the contents of the buffer. Up to AMOUNT_OF_ENTROPY can be loaded at once.
 *
 * @param bytes  random bytes to be generated by the caller (NOTE: take care to clear this buffer afterward!)
 * @param amount number of bytes in the buffer
 * @return       how much entropy is left (negative value if the amount is greater than the size of the entropy pool)
 */
long TUTA_inject_entropy(const void *bytes, size_t amount) {
    // Cap it at the maximum size of our entropy pool
    size_t actual_copy_amount = amount;
    if (actual_copy_amount > sizeof(entropy)) {
        actual_copy_amount = sizeof(entropy);
    }

    // clear any entropy that is leftover
    memset(entropy, 0, sizeof(entropy));

    // Copy in the entropy now
    current_offset = sizeof(entropy) - actual_copy_amount;
    memcpy(entropy + current_offset, bytes, actual_copy_amount);

    return (long) sizeof(entropy) - (long) amount;
}

/**
 * randombytes override - use external bytes
 */
void OQS_randombytes(uint8_t *random_array, size_t bytes_to_read) {
    // If we don't have enough entropy remaining, crash
    size_t remaining_entropy = sizeof(entropy) - current_offset;
    if (bytes_to_read > remaining_entropy) {
        exit(1);
    }

    uint8_t *entropy_to_copy = entropy + current_offset;

    memcpy(random_array, entropy_to_copy, bytes_to_read);
    memset(entropy_to_copy, 0, bytes_to_read); // clear out the bytes we just copied so it only exists in one place

    current_offset += bytes_to_read;
}
